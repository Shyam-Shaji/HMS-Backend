import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hospital, HospitalDocument } from './schemas/hospital.schema';
import { CreateHospitalDto } from './dtos/create-hospital.dto';
import { UpdateHospitalDto } from './dtos/update-hospital.dto';

@Injectable()
export class HospitalsService {
    constructor(@InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>){}

    async create(dto: CreateHospitalDto) {
        const existing = await this.hospitalModel.findOne({slug: dto.slug});
        if(existing) throw new ConflictException('Hospital slug already in use');
        return this.hospitalModel.create(dto);
    }

    async findAll(){
        return this.hospitalModel.find();
    }

    async findById(id: string){
        const hospital = await this.hospitalModel.findById(id);
        if(!hospital) throw new NotFoundException('Hospital not found');
        return hospital;
    }

    async update(id: string, dto: UpdateHospitalDto) {
        const hospital = await this.hospitalModel.findByIdAndUpdate(id, dto, {new: true});
        if(!hospital) throw new NotFoundException('Hospital not found');
        return hospital;
    }

    async setModules(id: string, modulesEnabled: string[]) {
        return this.update(id, {modulesEnabled} as UpdateHospitalDto);
    }
}
