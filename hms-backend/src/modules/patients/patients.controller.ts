import { Controller,Body, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdateMyPatientDto } from './dto/update-my-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import { LinkUserDto } from './dto/link-user.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// Staff roles that need to look up / view a patient record day-to-day.
// (Doctor/Nurse for clinical care, Reception for check-in, Pharmacist/Lab
// to attach dispensing & results, Billing to raise invoices.)
const STAFF_READ_ROLES = [
    Role.HOSPITAL_ADMIN,
    Role.DOCTOR,
    Role.NURSE,
    Role.RECEPTIONIST,
    Role.PHARMACIST,
    Role.LAB_TECHNICIAN,
    Role.BILLING_STAFF,
];

// Roles allowed to register a new patient or edit clinical/administrative
// details on an existing record.
const STAFF_WRITE_ROLES = [Role.HOSPITAL_ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST];

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('patients')
export class PatientsController {
    constructor(private readonly patientsService: PatientsService){}

    // ---- Patient portal (self-service) routes first: must be declared
  // before ':id' routes so Express doesn't treat "me" as an :id param. ----

  @Get('me')
  @Roles(Role.PATIENT)
  findMyRecords(@CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.findMyRecords(user.userId);
  }

  @Get('me/:id')
  @Roles(Role.PATIENT)
  findMyRecordById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.findMyRecordById(user.userId, id);
  }

  @Patch('me/:id')
  @Roles(Role.PATIENT)
  updateMyRecord(
    @Param('id') id: string,
    @Body() dto: UpdateMyPatientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patientsService.updateMyRecord(user.userId, id, dto);
  }

  // ---- Staff routes ----
  @Post()
  @Roles(...STAFF_WRITE_ROLES)
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Get()
  @Roles(...STAFF_READ_ROLES)
  search(@Query() query: SearchPatientDto){
    return this.patientsService.search(query);
  }

  @Get(':id')
  @Roles(...STAFF_READ_ROLES)
  findOne(@Param('id') id: string){
    return this.patientsService.findById(id);
  }

  @Patch(':id')
  @Roles(...STAFF_WRITE_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }

  @Patch(':id/link-user')
  @Roles(Role.HOSPITAL_ADMIN, Role.RECEPTIONIST)
  linkUser(@Param('id') id: string, @Body() dto: LinkUserDto) {
    return this.patientsService.linkUser(id, dto.userId);
  }

  @Patch(':id/deactivate')
  @Roles(Role.HOSPITAL_ADMIN)
  deactivate(@Param('id') id: string) {
    return this.patientsService.deactivate(id);
  }
}

