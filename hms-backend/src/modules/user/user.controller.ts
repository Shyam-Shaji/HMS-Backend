import { Controller, Body, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBasicAuth, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../common/enums/role.enums';
import { Roles } from '../../common/decorators/role.decorator';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('user')
@ApiBasicAuth()
@UseGuards(RolesGuard)
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService){}

    // Hospital Admin creates staff accounts (doctor, nurse, reception, etc)
    // for their own hospital. Super Admin can create any account.
    @Post()
    @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN)
    create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: AuthenticatedUser){
        if(currentUser.role === Role.HOSPITAL_ADMIN){
            dto.hospitalId = currentUser.hospitalId!; // hospital admin can only create staff for their own hospital
        }
        return this.userService.create(dto);
    }

    @Get('me')
    findMe(@CurrentUser() user: AuthenticatedUser){
        return this.userService.findById(user.userId);
    }

    @Patch('me')
    updateMe(@Body() dto: UpdateUserDto, @CurrentUser() user: AuthenticatedUser){
        return this.userService.update(user.userId, dto);
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN)
    findOne(@Param('id') id: string){
        return this.userService.findById(id);
    }

    @Patch(':id/deactivate')
    @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN)
    deactivate(@Param('id') id: string){
        return this.userService.deactivate(id);
    }
}
