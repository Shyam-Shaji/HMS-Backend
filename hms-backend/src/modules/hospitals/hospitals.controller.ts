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
@ApiTags('hospitals')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('hospitals')
export class HospitalsController {
    constructor(private readonly hospitalsService: HospitalsService){}

    @Post()
    create(@Body() dto: CreateHospitalDto) {
        return this.hospitalsService.create(dto);
    }

    @Get()
    findAll(){
        return this.hospitalsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string){
        return this.hospitalsService.findById(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateHospitalDto){
        return this.hospitalsService.update(id, dto);
    }
}
