import { Controller, Body, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CancelPrescriptionDto } from './dto/cancel-prescription.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// Narrower than EMR's clinical roles in one direction (no general Nurse
// write access - prescriptions are doctor-authored) but wider in another
// (Pharmacist can read, since they need it to dispense).
const PRESCRIPTION_READ_ROLES = [Role.DOCTOR, Role.NURSE, Role.PHARMACIST, Role.HOSPITAL_ADMIN];

@ApiTags('prescriptions')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class PrescriptionsController {
    constructor(private readonly prescriptionsService: PrescriptionsService){}

    // ---- Patient self-service ----
    @Get('prescriptions/me')
    @Roles(Role.PATIENT)
    findMyPrescriptions(@CurrentUser() user: AuthenticatedUser) {
        return this.prescriptionsService.findMyPrescriptions(user.userId);
    }

    @Get('prescriptions/me/:id')
    @Roles(Role.PATIENT)
    findMyPrescriptionById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
        return this.prescriptionsService.findMyPrescriptionById(user.userId, id);
    }

    // ---- Doctor: create against a specific visit ----

    @Post('emr/visits/:appointmentId/prescriptions')
    @Roles(Role.DOCTOR)
    create(@Param('appointmentId') appointmentId: string, @Body() dto: CreatePrescriptionDto) {
        return this.prescriptionsService.create(appointmentId, dto);
    }

    @Get('emr/visits/:appointmentId/prescriptions')
    @Roles(...PRESCRIPTION_READ_ROLES)
    findByAppointment(@Param('appointmentId') appointmentId: string) {
        return this.prescriptionsService.findByAppointment(appointmentId);
    }

    // ---- Staff: direct lookup / patient-wide view (e.g. pharmacy queue) ----

    @Get('prescriptions/:id')
    @Roles(...PRESCRIPTION_READ_ROLES)
    findOne(@Param('id') id: string) {
        return this.prescriptionsService.findById(id);
    }

    @Get('patients/:patientId/prescriptions')
    @Roles(...PRESCRIPTION_READ_ROLES)
    findForPatient(@Param('patientId') patientId: string) {
        return this.prescriptionsService.findForPatient(patientId);
    }

    @Patch('prescriptions/:id/cancel')
    @Roles(Role.DOCTOR)
    cancel(@Param('id') id: string, @Body() dto: CancelPrescriptionDto) {
        return this.prescriptionsService.cancel(id, dto);
    }
}
