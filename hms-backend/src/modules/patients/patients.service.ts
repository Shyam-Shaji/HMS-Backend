import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient, PatientDocument } from './schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import { CounterService } from '../../common/counter/counter.service';
import { getCurrentHospitalId } from '../../common/context/tenant-context';
import { UpdateMyPatientDto } from './dto/update-my-patient.dto';

@Injectable()
export class PatientsService {
    constructor(
        @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
        private readonly counterService: CounterService,
    ){}

    async create(dto: CreatePatientDto): Promise<PatientDocument>{
        const hospitalId = getCurrentHospitalId();
        if(!hospitalId){
            // Should already be blocked by TenantGuard for staff roles, but this
            // is the service-level guarantee that a patient record can never be
            // created without knowing which hospital it belongs to.
            throw new BadRequestException('Hospital context is required to register a patient');
        }
        
        const seq = await this.counterService.next(`uhid:${hospitalId}`);
        const uhid = `PT${new Date().getFullYear()}${String(seq).padStart(6,'0')}`;

        const existingPhone = await this.patientModel.findOne({phone: dto.phone});
        if(existingPhone){
            // Not a hard block - a family may share a phone number - but the
            // frontend registration screen should warn reception and offer to
            // pull up the existing record instead of blindly creating a duplicate.           
        }

        return this.patientModel.create({...dto,uhid});
    }

    async search(query: SearchPatientDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const filter: any = {};

        if(query.q){
            const regex = new RegExp(query.q,'i');
            filter.$or = [{name: regex}, {phone: regex}, {uhid: regex}];
        }
        const [items,total] = await Promise.all([
            this.patientModel
            .find(filter)
            .sort({createdAt: -1})
            .skip((page - 1) * limit)
            .limit(limit),
            this.patientModel.countDocuments(filter),
        ]);

        return { items, total, page, limit, totalPages: Math.ceil(total/limit)};
    }

    async findById(id: string): Promise<PatientDocument>{
        const patient = await  this.patientModel.findById(id);
        if(!patient) throw new NotFoundException("Patient not found");
        return patient;
    }

    // Used by the patient portal - return every hospital's record linked to 
    // this user's account. Because a PATIENT's JWT carries hospitalId: null,
    // the tenant plugin does not narrow this query to a single hospital.
    async findMyRecords(userId: string){
        return this.patientModel.find({userId});
    }

    async findMyRecordById(userId: string, patientId: string): Promise<PatientDocument>{
        const patient = await this.patientModel.findOne({_id: patientId, userId});
        if(!patient) throw new NotFoundException('Patient record not found');
        return patient;
    }

    async update(id: string, dto: UpdatePatientDto): Promise<PatientDocument>{
        const patient = await this.patientModel.findByIdAndUpdate(id, dto, {new: true});
        if(!patient) throw new NotFoundException('Patient record not found');
        return patient;
    }

    async updateMyRecord(userId: string, patientId: string, dto: UpdateMyPatientDto): Promise<PatientDocument>{
        const patient = await this.patientModel.findOneAndUpdate({_id: patientId, userId}, dto, {new: true});
        if(!patient) throw new NotFoundException('Patient record not found');
        return patient;
    }

    async linkUser(patientId: string, userId: string): Promise<PatientDocument>{
        const patient = await this.patientModel.findById(patientId);
        if(!patient) throw new NotFoundException('Patient record not found');
        if(patient.userId && patient.userId.toString() !== userId){
            throw new ForbiddenException('This patient record is already linked to a different account');
        }
        patient.userId = userId as any;
        return patient.save();
    }

    async deactivate(id: string): Promise<PatientDocument>{
        const patient = await this.patientModel.findByIdAndUpdate(id, {isActive: false}, {new: true});
        if(!patient) throw new NotFoundException('Patient record not found');
        return patient;
    }
}

