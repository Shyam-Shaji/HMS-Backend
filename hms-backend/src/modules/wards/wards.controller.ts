import { Controller, Body, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WardsService } from './wards.service';
import { CreateWardDto } from './dto/create-ward.dto';
import { UpdateWardDto } from './dto/update-ward.dto';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedStatusDto } from './dto/update-bed-status.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';

const IPD_STAFF_READ_ROLES = [
  Role.HOSPITAL_ADMIN,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.BILLING_STAFF,
];

@ApiTags('wards')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class WardsController {
  constructor(private readonly wardsService: WardsService) {}

  @Post('wards')
  @Roles(Role.HOSPITAL_ADMIN)
  createWard(@Body() dto: CreateWardDto) {
    return this.wardsService.createWard(dto);
  }

  @Get('wards')
  @Roles(...IPD_STAFF_READ_ROLES)
  findAllWards() {
    return this.wardsService.findAllWards();
  }

  @Get('wards/:id')
  @Roles(...IPD_STAFF_READ_ROLES)
  findWard(@Param('id') id: string) {
    return this.wardsService.findWardById(id);
  }

  @Patch('wards/:id')
  @Roles(Role.HOSPITAL_ADMIN)
  updateWard(@Param('id') id: string, @Body() dto: UpdateWardDto) {
    return this.wardsService.updateWard(id, dto);
  }

  @Post('wards/:wardId/beds')
  @Roles(Role.HOSPITAL_ADMIN)
  addBed(@Param('wardId') wardId: string, @Body() dto: CreateBedDto) {
    return this.wardsService.addBed(wardId, dto);
  }

  @Get('wards/:wardId/beds')
  @Roles(...IPD_STAFF_READ_ROLES)
  findBedsForWard(@Param('wardId') wardId: string) {
    return this.wardsService.findBedsForWard(wardId);
  }

  // Full cross-ward bed grid - the Nurse Ward Board screen.
  @Get('beds/board')
  @Roles(...IPD_STAFF_READ_ROLES)
  getWardBoard() {
    return this.wardsService.getWardBoard();
  }

  @Patch('beds/:id/status')
  @Roles(Role.NURSE, Role.HOSPITAL_ADMIN)
  updateBedStatus(@Param('id') id: string, @Body() dto: UpdateBedStatusDto) {
    return this.wardsService.updateBedStatus(id, dto);
  }
}

