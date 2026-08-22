import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../common/enums/role.enums';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>){}

    async create(dto: CreateUserDto): Promise<UserDocument>{
        if(dto.email){
            const existing = await this.userModel.findOne({email: dto.email});
            if(existing) throw new ConflictException('Email already registered');
        }
        if(dto.phone){
            const existing = await this.userModel.findOne({phone: dto.phone});
            if(existing) throw new ConflictException('Phone already registered');
        }

        const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : undefined;

        const user = await this.userModel.create({
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            role: dto.role,
            hospitalId: dto.role === Role.SUPER_ADMIN || dto.role === Role.PATIENT ? null : dto.hospitalId,
            department: dto.department,
        });
        return user.save();
    }

    findByEmailOrPhone(identifier: string){
        return this.userModel
        .findOne({$or: [{email: identifier}, {phone: identifier}]})
        .select('+passwordHash +refreshTokenHash');
    }

    async findById(id: string): Promise<UserDocument>{
        const user = await this.userModel.findById(id);
        if(!user) throw new NotFoundException('User not found');
        return user;
    }

    findAllForHospital(hospitalId: string){
        // Note: tenant plugin (once applied here) would auto-scope this
        // User schema intentionally does NOT use the tenant plugin because
        // it mmust also serve platform-leve accounts (super_admin/patient),
        // so we filter explicitly for staff-listing use cases like this one.
        return this.userModel.find({hospitalId});
    }

    async update(id: string, dto: UpdateUserDto): Promise<UserDocument>{
        const user = await this.userModel.findByIdAndUpdate(id, dto, {new: true});
        if(!user) throw new NotFoundException('User not found');
        return user;
    }

    async setRefreshTokenHash(userId: string, refreshTokenHash: string | null){
        await this.userModel.findByIdAndUpdate(userId, {refreshTokenHash});
    }

    async deactivate(id: string){
        const user = await this.userModel.findByIdAndUpdate(id, {isActive: false}, {new: true});
        if(!user) throw new NotFoundException('User not found');
        return user;
    }
}
