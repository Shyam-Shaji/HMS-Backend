import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MedicalRecord, MedicalRecordDocument, MedicalRecordStatus } from './schemas/medical-record.schema';
import { UpdateVitalsDto } from './dto/update-vitals.dto';
import { UpdateClinicalDto } from './dto/update-clinical.dto';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { AppointmentsService } from '../appointments/appointments.service';

@Injectable()
export class EmrService {
    constructor(
        @InjectModel(MedicalRecord.name) private recordModel: Model<MedicalRecordDocument>,
        @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
        private readonly appointmentsService: AppointmentsService,
    ){}

    // Finds the record for a visit, or creates a fresh draft. patientId/
    // doctorId/hospitalId are always derived server-side from the
    // Appointment - never trusted from the request body - so a doctor can't 
    // accidentlly (or maliciously) write a note  onto the wrong patient.
    private async getOrCreateDraft(appointmentId: string): Promise<MedicalRecordDocument>{
        let record = await this.recordModel.findOne({appointmentId});
        if(record) return record;

        const appointment = await this.appointmentsService.findById(appointmentId);
        const patient = await this.patientModel.findById(appointment.patientId);
        if(!patient) throw new NotFoundException('Patient record not found for this appointment.');

        record = new this.recordModel({
            appointmentId: appointment._id,
            patientId: appointment.patientId,
            patientUserId: patient.userId ?? null,
            doctorId: appointment.doctorId,
            visitDate: appointment.scheduledDate,
            status: MedicalRecordStatus.DRAFT,
        });
        return record.save();
    }

    private assertEditable(record: MedicalRecordDocument){
        if(record.status === MedicalRecordStatus.FINALIZED){
            throw new BadRequestException('This record is finalized and cannot be edited. Corrections required a new addendum entry.');
        }
    }

    async updateVitals(appointmentId: string, dto: UpdateVitalsDto, recordedBy: string): Promise<MedicalRecordDocument>{
        const record = await this.getOrCreateDraft(appointmentId);
        this.assertEditable(record);
        record.vitals = {...record.vitals, ...dto, recordedBy: recordedBy as any, recordedAt: new Date()};
        return record.save();
    }

    async updateClinical(appointmentId: string, dto: UpdateClinicalDto): Promise<MedicalRecordDocument>{
        const record = await this.getOrCreateDraft(appointmentId);
        this.assertEditable(record);

        if (dto.chiefComplaint !== undefined) record.chiefComplaint = dto.chiefComplaint;
        if (dto.diagnosis !== undefined) record.diagnosis = dto.diagnosis as any;
        if (dto.doctorNotes !== undefined) record.doctorNotes = dto.doctorNotes;
        if (dto.followUpDate !== undefined) record.followUpDate = new Date(dto.followUpDate);
        if (dto.referredTo !== undefined) record.referredTo = dto.referredTo;
        if (dto.attachments !== undefined) record.attachments = dto.attachments as any;

        return record.save();
    }

    async finalize(appointmentId: string): Promise<MedicalRecordDocument>{
        const record = await this.recordModel.findOne({appointmentId});
        if(!record) throw new NotFoundException('No recod exists yet for this appointment');
        this.assertEditable(record);
        record.status = MedicalRecordStatus.FINALIZED;
        record.finalizedAt = new Date();
        return record.save();
    }

    async findByAppointment(appointmentId: string): Promise<MedicalRecordDocument>{
        const record = await this.recordModel.findOne({appointmentId});
        if(!record) throw new NotFoundException('No medical record exists for this appointment yet');
        return record;
    }

    // Full chronological history for a patient - the doctor's "patient
    // history" panel and the patient portal's EMR timeline. Only finalized
    // records are shown outside the authoring doctor's own draft view, since
    // an in-progress note isn't a reliable clinical record yet.
    async getPatientHistory(patientId: string, page = 1, limit = 20){
        const filter = {patientId, status: MedicalRecordStatus.FINALIZED};
        const [items, total] = await Promise.all([
            this.recordModel
            .find(filter)
            .sort({visitDate: -1})
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('doctorId', 'name department'),
            this.recordModel.countDocuments(filter),
        ]);
        return{items, total, page, limit, totalPages: Math.ceil(total/limit)};
    }

    // The "single-pane consultation view" data bundle: patient's key safety
    // info (allergies sit on the Patient record) plus their most recent
    // finalized visit, in one call instead of the frontend stitching together
    // three requests before a doctor can safely see a patient.
    async getPatientSummary(patientId: string) {
    const patient = await this.patientModel.findById(patientId);
    if (!patient) throw new NotFoundException('Patient not found');

    const lastVisit = await this.recordModel
      .findOne({ patientId, status: MedicalRecordStatus.FINALIZED })
      .sort({ visitDate: -1 })
      .populate('doctorId', 'name department');

    return {
      patientId: patient._id,
      name: patient.name,
      uhid: patient.uhid,
      dob: patient.dob,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      lastVisit,
    };
  }

    findMyHistory(userId: string) {
    return this.recordModel
      .find({ patientUserId: userId, status: MedicalRecordStatus.FINALIZED })
      .sort({ visitDate: -1 })
      .populate('doctorId', 'name department');
    }

    async findMyRecordByAppointment(userId: string, appointmentId: string): Promise<MedicalRecordDocument> {
    const record = await this.recordModel.findOne({
      appointmentId,
      patientUserId: userId,
      status: MedicalRecordStatus.FINALIZED,
    });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }  
}
