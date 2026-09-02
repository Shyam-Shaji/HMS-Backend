import { Controller, Body, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmrService } from './emr.service';
import { UpdateVitalsDto } from './dto/update-vitals.dto';
import { UpdateClinicalDto } from './dto/update-clinical.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// Clinical read access is deliberately narrower than general "staff" -
// Reception/Pharmacist/Billing do not get chief complaints, diagnoses, or
// doctor notes. Compare to Patients module's STAFF_READ_ROLES, which is
// broader because demographics/contact info aren't sensitive the same way.
const CLINICAL_READ_ROLES = [Role.DOCTOR, Role.NURSE, Role.HOSPITAL_ADMIN];

@ApiTags('emr')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('emr')
export class EmrController {
    constructor(private readonly emrService: EmrService){}

    // ---- Patient self-service ----
    @Get('me/history')
    @Roles(Role.PATIENT)
    findMyHistory(@CurrentUser() user: AuthenticatedUser) {
        return this.emrService.findMyHistory(user.userId);
    }

    @Get('me/visits/:appointmentId')
    @Roles(Role.PATIENT)
    findMyRecord(@Param('appointmentId') appointmentId: string, @CurrentUser() user: AuthenticatedUser) {
        return this.emrService.findMyRecordByAppointment(user.userId, appointmentId);
    }

    // ---- Nurse: vitals only ----

    @Patch('visits/:appointmentId/vitals')
    @Roles(Role.NURSE, Role.DOCTOR)
    updateVitals(
        @Param('appointmentId') appointmentId: string,
        @Body() dto: UpdateVitalsDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.emrService.updateVitals(appointmentId, dto, user.userId);
    }

    // ---- Doctor: clinical documentation ----

    @Patch('visits/:appointmentId')
    @Roles(Role.DOCTOR)
    updateClinical(@Param('appointmentId') appointmentId: string, @Body() dto: UpdateClinicalDto) {
        return this.emrService.updateClinical(appointmentId, dto);
    }

    @Patch('visits/:appointmentId/finalize')
    @Roles(Role.DOCTOR)
    finalize(@Param('appointmentId') appointmentId: string) {
        return this.emrService.finalize(appointmentId);
    }

    @Get('visits/:appointmentId')
    @Roles(...CLINICAL_READ_ROLES)
    findByAppointment(@Param('appointmentId') appointmentId: string) {
        return this.emrService.findByAppointment(appointmentId);
    }

    // ---- Patient history / consultation summary (staff) ----
    @Get('patients/:patientId/history')
    @Roles(...CLINICAL_READ_ROLES)
    getPatientHistory(
        @Param('patientId') patientId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
  ) {
    return this.emrService.getPatientHistory(patientId, Number(page) || 1, Number(limit) || 20);
  }

    @Get('patients/:patientId/summary')
    @Roles(...CLINICAL_READ_ROLES)
    getPatientSummary(@Param('patientId') patientId: string) {
        return this.emrService.getPatientSummary(patientId);
    } 
}
