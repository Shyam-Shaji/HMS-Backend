import { Controller, Body, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { Role } from '../../common/enums/role.enums';
import { Roles } from '../../common/decorators/role.decorator';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';

function assertSelfOrAdmin(currentUser: AuthenticatedUser, doctorId: string) {
    const isSelf = currentUser.role === Role.DOCTOR && currentUser.userId === doctorId;
    const isAdmin = currentUser.role === Role.HOSPITAL_ADMIN;
    if(!isSelf && !isAdmin){
        throw new ForbiddenException('You can only manage your own schedule');
    }
}

@ApiTags('doctors')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('doctors')
export class DoctorsController {
    constructor(private readonly doctorsService: DoctorsService) {}

    @Post(':doctorId/availability')
    @Roles(Role.DOCTOR, Role.HOSPITAL_ADMIN)
    setAvailability(
        @Param('doctorId') doctorId: string,
        @Body() dto: SetAvailabilityDto,
        @CurrentUser() user: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(user, doctorId);
    return this.doctorsService.setAvailability(doctorId, dto);
  }

  // Anyone authenticated (reception, patient browsing doctors, etc.) can
  // view a doctor's schedule shape and open slots - no @Roles restriction.
  @Get(':doctorId/availability')
  getAvailability(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getAvailability(doctorId);
  }

  @Post(':doctorId/leave')
  @Roles(Role.DOCTOR, Role.HOSPITAL_ADMIN)
  createLeave(
    @Param('doctorId') doctorId: string,
    @Body() dto: CreateLeaveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(user, doctorId);
    return this.doctorsService.createLeave(doctorId, dto);
  }

  @Get(':doctorId/leave')
  getLeave(@Param('doctorId') doctorId: string) {
    return this.doctorsService.getLeave(doctorId);
  }

  @Get(':doctorId/slots')
  getSlots(@Param('doctorId') doctorId: string, @Query('date') date: string) {
    return this.doctorsService.getAvailableSlots(doctorId, date);
  }
}
