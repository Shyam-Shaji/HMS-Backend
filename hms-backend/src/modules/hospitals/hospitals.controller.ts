import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dtos/create-hospital.dto';
import { UpdateHospitalDto } from './dtos/update-hospital.dto';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';

// Tenant management - Super Admin only. This is the "onboard a new
// hospital" flow from the project plan (Super Admin > Onboard New Hospital).
const ALL_ROLES = [
  Role.SUPER_ADMIN,
  Role.HOSPITAL_ADMIN,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.PHARMACIST,
  Role.LAB_TECHNICIAN,
  Role.BILLING_STAFF,
  Role.PATIENT,
];

@ApiTags('hospitals')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  // Minimal public-within-the-platform directory (name/address only, not
  // subscription/modules data) - this is what a patient's "choose a
  // hospital" screen reads from before booking. Method-level @Roles
  // overrides the class default below since there wasn't previously any
  // non-admin read access to hospitals at all.
  @Get('directory')
  @Roles(...ALL_ROLES)
  directory() {
    return this.hospitalsService.findDirectory();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  findAll() {
    return this.hospitalsService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.hospitalsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateHospitalDto) {
    return this.hospitalsService.update(id, dto);
  }
}
