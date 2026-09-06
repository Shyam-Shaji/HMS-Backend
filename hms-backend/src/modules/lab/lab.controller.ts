import { Controller, Body, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LabService } from './lab.service';
import { CreateTestCatalogDto } from './dto/create-test-catalog.dto';
import { UpdateTestCatalogDto } from './dto/update-test-catalog.dto';
import { SearchTestCatalogDto } from './dto/search-test-catalog.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { UploadReportDto } from './dto/upload-report.dto';
import { CancelLabOrderDto } from './dto/cancel-lab-order.dto';
import { SearchLabOrderDto } from './dto/search-lab-order.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const LAB_READ_ROLES = [Role.LAB_TECHNICIAN, Role.DOCTOR, Role.NURSE, Role.HOSPITAL_ADMIN];
const LAB_MANAGE_ROLES = [Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN];

@ApiTags('lab')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class LabController {
    constructor(private readonly labService: LabService) {}

    // ---- Test catalogue ----

    @Post('lab/tests')
  @Roles(...LAB_MANAGE_ROLES)
  createTest(@Body() dto: CreateTestCatalogDto) {
    return this.labService.createTest(dto);
  }

  @Get('lab/tests')
  @Roles(...LAB_READ_ROLES)
  searchTests(@Query() query: SearchTestCatalogDto) {
    return this.labService.searchTests(query);
  }

  @Get('lab/tests/:id')
  @Roles(...LAB_READ_ROLES)
  findTest(@Param('id') id: string) {
    return this.labService.findTestById(id);
  }

  @Patch('lab/tests/:id')
  @Roles(...LAB_MANAGE_ROLES)
  updateTest(@Param('id') id: string, @Body() dto: UpdateTestCatalogDto) {
    return this.labService.updateTest(id, dto);
  }

  // ---- Ordering (doctor, from a visit or an admission) ----

  @Post('emr/visits/:appointmentId/lab-orders')
  @Roles(Role.DOCTOR)
  orderFromAppointment(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CreateLabOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.labService.orderFromAppointment(appointmentId, dto, user.userId);
  }

  @Post('admissions/:admissionId/lab-orders')
  @Roles(Role.DOCTOR)
  orderFromAdmission(
    @Param('admissionId') admissionId: string,
    @Body() dto: CreateLabOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.labService.orderFromAdmission(admissionId, dto, user.userId);
  }

  // ---- Patient self-service ----

  @Get('lab/me')
  @Roles(Role.PATIENT)
  findMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.labService.findMyOrders(user.userId);
  }

  @Get('lab/me/:id')
  @Roles(Role.PATIENT)
  findMyOrderById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.labService.findMyOrderById(user.userId, id);
  }

  // ---- Lab technician: order queue + lifecycle ----

  @Get('lab/orders')
  @Roles(...LAB_READ_ROLES)
  search(@Query() query: SearchLabOrderDto) {
    return this.labService.search(query);
  }

  @Get('lab/orders/:id')
  @Roles(...LAB_READ_ROLES)
  findOne(@Param('id') id: string) {
    return this.labService.findById(id);
  }

  @Patch('lab/orders/:id/collect-sample')
  @Roles(Role.LAB_TECHNICIAN)
  collectSample(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.labService.collectSample(id, user.userId);
  }

  @Patch('lab/orders/:id/start-processing')
  @Roles(Role.LAB_TECHNICIAN)
  startProcessing(@Param('id') id: string) {
    return this.labService.startProcessing(id);
  }

  @Patch('lab/orders/:id/result')
  @Roles(Role.LAB_TECHNICIAN)
  enterResult(@Param('id') id: string, @Body() dto: EnterResultDto) {
    return this.labService.enterResult(id, dto);
  }

  @Patch('lab/orders/:id/upload-report')
  @Roles(Role.LAB_TECHNICIAN)
  uploadReport(@Param('id') id: string, @Body() dto: UploadReportDto) {
    return this.labService.uploadReport(id, dto);
  }

  @Patch('lab/orders/:id/verify')
  @Roles(Role.LAB_TECHNICIAN)
  verify(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.labService.verify(id, user.userId);
  }

  @Patch('lab/orders/:id/cancel')
  @Roles(Role.DOCTOR, Role.LAB_TECHNICIAN, Role.HOSPITAL_ADMIN)
  cancel(@Param('id') id: string, @Body() dto: CancelLabOrderDto) {
    return this.labService.cancel(id, dto);
  }

  // ---- Patient history (staff view, e.g. before a consultation) ----

  @Get('lab/patients/:patientId/history')
  @Roles(...LAB_READ_ROLES)
  getPatientHistory(@Param('patientId') patientId: string) {
    return this.labService.getPatientHistory(patientId);
  }
}
