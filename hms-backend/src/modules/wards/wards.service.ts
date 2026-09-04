import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ward, WardDocument } from './schemas/ward.schema';
import { Bed, BedDocument, BedStatus } from './schemas/bed.schema';
import { CreateWardDto } from './dto/create-ward.dto';
import { UpdateWardDto } from './dto/update-ward.dto';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedStatusDto } from './dto/update-bed-status.dto';

@Injectable()
export class WardsService {
    constructor(
        @InjectModel(Ward.name) private wardModel: Model<WardDocument>,
        @InjectModel(Bed.name) private bedModel: Model<BedDocument>,
    ){}

    createWard(dto: CreateWardDto){
        return this.wardModel.create(dto);
    }

    findAllWards(){
        return this.wardModel.find({isActive: true});
    }

    async findWardById(id: string): Promise<WardDocument>{
        const ward = await this.wardModel.findById(id);
        if(!ward) throw new NotFoundException('Ward not found');
        return ward;
    }

    async updateWard(id: string, dto: UpdateWardDto): Promise<WardDocument>{
        const ward = await this.wardModel.findByIdAndUpdate(id, dto, {new: true});
        if(!ward) throw new NotFoundException('Ward not found');
        return ward;
    }

    async addBed(wardId: string, dto: CreateBedDto): Promise<BedDocument>{
        await this.findWardById(wardId); // 404s if the ward doesn't exist
        const existing = await this.bedModel.findOne({wardId, bedNumber: dto.bedNumber});
        if(existing) throw new ConflictException('A bed with this number already exists in this ward');
        return this.bedModel.create({wardId, bedNumber: dto.bedNumber});
    }

    findBedsForWard(wardId: string){
        return this.bedModel.find({wardId}).sort({bedNumber: 1});
    }

    async findBedById(id: string): Promise<BedDocument>{
        const bed = await this.bedModel.findById(id);
        if(!bed) throw new NotFoundException('Bed not found');
        return bed;
    }

    // The Nurse "Ward Board" screen: every bed across every ward, in one
    // call, so the frontend can render the full bed-by-bed grid without
    // N+1 requests per ward.
    async getWardBoard() {
        const [wards, beds] = await Promise.all([
            this.wardModel.find({ isActive: true }),
            this.bedModel.find({ isActive: true }).sort({ bedNumber: 1 }),
        ]);
        return wards.map((ward) => ({
            ward,
            beds: beds.filter((b) => b.wardId.toString() === (ward._id as any).toString()),
        }));
    }

    // Manual override (e.g. housekeeping marks a bed clean and ready again).
    // Admission/discharge/transfer flows set bed status automatically via
    // AdmissionsService - this is for the cases outside that lifecycle.
    async updateBedStatus(id: string, dto: UpdateBedStatusDto): Promise<BedDocument> {
        const bed = await this.bedModel.findById(id);
        if (!bed) throw new NotFoundException('Bed not found');
        if (bed.status === BedStatus.OCCUPIED && dto.status !== BedStatus.OCCUPIED) {
            throw new ConflictException('Cannot change status of an occupied bed directly - discharge or transfer the patient first');
        }
        bed.status = dto.status;
        return bed.save();
    }
}
