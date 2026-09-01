import { Controller, Body, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { SearchAppointmentDto } from './dto/search-appointment.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const STAFF_BOOKING_ROLES = [Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.NURSE, Role.DOCTOR];
const STAFF_READ_ROLES = [
  Role.RECEPTIONIST,
  Role.HOSPITAL_ADMIN,
  Role.NURSE,
  Role.DOCTOR,
  Role.PHARMACIST,
  Role.LAB_TECHNICIAN,
  Role.BILLING_STAFF,
];

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService){}

    // ---- Patient self-service (declared before ':id' routes) ----

  @Get('me')
  @Roles(Role.PATIENT)
  findMyAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.findMyAppointments(user.userId);
  }

  @Post('me')
  @Roles(Role.PATIENT)
  bookForMyself(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.book(dto, user.userId);
  }

  @Patch('me/:id/cancel')
  @Roles(Role.PATIENT)
  cancelMyAppointment(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.cancel(id, dto, user.userId);
  }

  @Patch('me/:id/reschedule')
  @Roles(Role.PATIENT)
  rescheduleMyAppointment(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.reschedule(id, dto, user.userId);
  }

  // ---- Live queue (staff + patient waiting-room views) ----

  @Get('queue/:doctorId')
  getQueue(@Param('doctorId') doctorId: string, @Query('date') date: string) {
    return this.appointmentsService.getQueue(doctorId, date);
  }

  // ---- Staff booking & management ----

  @Post()
  @Roles(...STAFF_BOOKING_ROLES)
  book(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.book(dto, user.userId);
  }

  @Get()
  @Roles(...STAFF_READ_ROLES)
  search(@Query() query: SearchAppointmentDto) {
    return this.appointmentsService.search(query);
  }

  @Get(':id')
  @Roles(...STAFF_READ_ROLES)
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findById(id);
  }

  @Patch(':id/reschedule')
  @Roles(...STAFF_BOOKING_ROLES)
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.reschedule(id, dto, user.userId);
  }

  @Patch(':id/cancel')
  @Roles(...STAFF_BOOKING_ROLES)
  cancel(@Param('id') id: string, @Body() dto: CancelAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.cancel(id, dto, user.userId);
  }

  @Patch(':id/check-in')
  @Roles(Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.NURSE)
  checkIn(@Param('id') id: string) {
    return this.appointmentsService.checkIn(id);
  }

  @Patch(':id/start')
  @Roles(Role.DOCTOR)
  startConsultation(@Param('id') id: string) {
    return this.appointmentsService.startConsultation(id);
  }

  @Patch(':id/complete')
  @Roles(Role.DOCTOR)
  complete(@Param('id') id: string) {
    return this.appointmentsService.complete(id);
  }

  @Patch(':id/no-show')
  @Roles(Role.RECEPTIONIST, Role.HOSPITAL_ADMIN, Role.NURSE, Role.DOCTOR)
  markNoShow(@Param('id') id: string) {
    return this.appointmentsService.markNoShow(id);
  }
}
