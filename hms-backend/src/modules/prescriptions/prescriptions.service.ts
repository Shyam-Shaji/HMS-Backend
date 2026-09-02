import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prescription, PrescriptionDocument, PrescriptionStatus } from './schemas/prescription.schema';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CancelPrescriptionDto } from './dto/cancel-prescription.dto';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { AppointmentsService } from '../appointments/appointments.service';

@Injectable()
export class PrescriptionsService {
    constructor(
        @InjectModel(Prescription.name) private prescriptionModel: Model<PrescriptionDocument>,
        @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
        private readonly appointmentsService: AppointmentsService,
    ){}

    async create(appointmentId: string, dto: CreatePrescriptionDto): Promise<PrescriptionDocument>{
        // Same pattern as EMR: patient/doctor identity comes from the
        // Appointment record, never trusted from the request body.
        const appointment = await this.appointmentsService.findById(appointmentId);
        const patient = await this.patientModel.findById(appointment.patientId);
        if(!patient) throw new NotFoundException('Patient record not found for this appointment');

        return this.prescriptionModel.create({
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            patientUserId: patient.userId ?? null,
            doctorId: appointment.doctorId,
            medicines: dto.medicines,
            notes: dto.notes,
        });
    }

    findByAppointment(appointmentId: string){
        return this.prescriptionModel.findOne({appointmentId}).sort({createdAt: -1});
    }

    async findById(id: string): Promise<PrescriptionDocument>{
        const prescription = await this.prescriptionModel.findById(id).populate('doctorId', 'name department');
        if(!prescription) throw new NotFoundException('Prescription not found');
        return prescription;
    }

    findForPatient(patientId: string){
        return this.prescriptionModel.find({patientId}).sort({createdAt: -1}).populate('doctorId', 'name department');
    }

    async cancel(id: string, dto: CancelPrescriptionDto): Promise<PrescriptionDocument>{
        const prescription = await this.prescriptionModel.findById(id);
        if(!prescription) throw new NotFoundException('Prescription not found');
       prescription.status = PrescriptionStatus.CANCELLED;
       prescription.cancelReason = dto.reason;
       return prescription.save();
    }

    findMyPrescriptions(userId: string){
        return this.prescriptionModel
        .find({patientUserId: userId})
        .sort({createdAt: -1})
        .populate('doctorId', 'name department');
    }

    async findMyPrescriptionById(userId: string, id: string): Promise<PrescriptionDocument>{
        const prescription = await this.prescriptionModel
        .findOne({_id: id, patientUserId: userId})
        .populate('doctorId', 'name department');
        if(!prescription) throw new NotFoundException('Prescription not found');
        return prescription;
    }
}
