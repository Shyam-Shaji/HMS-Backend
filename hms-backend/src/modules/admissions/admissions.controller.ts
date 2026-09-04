import { Controller, Body, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdmissionsService } from './admissions.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { TransferAdmissionDto } from './dto/transfer-admission.dto';
import { DischargeAdmissionDto } from './dto/discharge-admission.dto';
import { AddVitalsLogDto } from './dto/add-vitals-log.dto';
import { AddRoundNoteDto } from './dto/add-round-note.dto';
import { CreateMedicationOrderDto } from './dto/create-medication-order.dto';
import { AdministerMedicationDto } from './dto/administer-medication.dto';
import { SearchAdmissionDto } from './dto/search-admission.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const IPD_READ_ROLES = [Role.HOSPITAL_ADMIN, Role.DOCTOR, Role.NURSE, Role.BILLING_STAFF];
const IPD_WRITE_ROLES = [Role.HOSPITAL_ADMIN, Role.DOCTOR, Role.NURSE];

@ApiTags('admissions')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('admissions')
export class AdmissionsController {
    constructor(private readonly admissionsService: AdmissionsService){}

    // ---- Patient self-service ----

    @Get('me')
    @Roles(Role.PATIENT)
    findMyAdmissions(@CurrentUser() user: AuthenticatedUser) {
        return this.admissionsService.findMyAdmissions(user.userId);
    }

    // ---- Core admission lifecycle ----

    @Post()
    @Roles(Role.DOCTOR, Role.NURSE, Role.HOSPITAL_ADMIN)
    admit(@Body() dto: CreateAdmissionDto, @CurrentUser() user: AuthenticatedUser) {
        return this.admissionsService.admit(dto, user.userId);
    }

    @Get()
    @Roles(...IPD_READ_ROLES)
    search(@Query() query: SearchAdmissionDto) {
    return this.admissionsService.search(query);
  }

  @Get(':id')
  @Roles(...IPD_READ_ROLES)
  findOne(@Param('id') id: string) {
    return this.admissionsService.findById(id);
  }

  @Patch(':id/transfer')
  @Roles(...IPD_WRITE_ROLES)
  transfer(@Param('id') id: string, @Body() dto: TransferAdmissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.admissionsService.transfer(id, dto, user.userId);
  }

  @Patch(':id/discharge')
  @Roles(Role.DOCTOR)
  discharge(@Param('id') id: string, @Body() dto: DischargeAdmissionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.admissionsService.discharge(id, dto, user.userId);
  }

  @Patch(':id/discharge/nurse-checklist')
  @Roles(Role.NURSE)
  completeNurseChecklist(@Param('id') id: string) {
    return this.admissionsService.completeNurseDischargeChecklist(id);
  }

  // ---- Vitals log (nurse charting) ----

  @Post(':id/vitals')
  @Roles(Role.NURSE, Role.DOCTOR)
  addVitalsLog(@Param('id') id: string, @Body() dto: AddVitalsLogDto, @CurrentUser() user: AuthenticatedUser) {
    return this.admissionsService.addVitalsLog(id, dto, user.userId);
  }

  @Get(':id/vitals')
  @Roles(...IPD_READ_ROLES)
  getVitalsLogs(@Param('id') id: string) {
    return this.admissionsService.getVitalsLogs(id);
  }

  // ---- Doctor rounds notes ----

  @Post(':id/rounds')
  @Roles(Role.DOCTOR)
  addRoundNote(@Param('id') id: string, @Body() dto: AddRoundNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.admissionsService.addRoundNote(id, dto, user.userId);
  }

  @Get(':id/rounds')
  @Roles(...IPD_READ_ROLES)
  getRoundNotes(@Param('id') id: string) {
    return this.admissionsService.getRoundNotes(id);
  }

  // ---- Medication orders / MAR ----

  @Post(':id/medications')
  @Roles(Role.DOCTOR)
  createMedicationOrder(
    @Param('id') id: string,
    @Body() dto: CreateMedicationOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admissionsService.createMedicationOrder(id, dto, user.userId);
  }

  @Get(':id/medications')
  @Roles(Role.DOCTOR, Role.NURSE, Role.PHARMACIST, Role.HOSPITAL_ADMIN)
  getMedicationOrders(@Param('id') id: string) {
    return this.admissionsService.getMedicationOrders(id);
  }

  @Patch(':id/medications/:orderId/administer')
  @Roles(Role.NURSE)
  administerMedication(
    @Param('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: AdministerMedicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admissionsService.administerMedication(id, orderId, dto, user.userId);
  }
}
