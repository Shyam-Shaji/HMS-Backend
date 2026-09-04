import { Injectable, BadRequestException, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admission, AdmissionDocument, AdmissionStatus } from './schemas/admission.schema';
import { AdmissionVitalsLog, AdmissionVitalsLogDocument } from './schemas/admission-vitals-log.schema';
import { AdmissionRoundNote, AdmissionRoundNoteDocument } from './schemas/admission-round-note.schema';
import { 
    AdmissionMedicationOrder, 
    AdmissionMedicationOrderDocument } from './schemas/admission-medication-order.schema';
import { Bed, BedDocument, BedStatus } from '../wards/schemas/bed.schema';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { TransferAdmissionDto } from './dto/transfer-admission.dto';
import { DischargeAdmissionDto } from './dto/discharge-admission.dto';
import { AddVitalsLogDto } from './dto/add-vitals-log.dto';
import { AddRoundNoteDto } from './dto/add-round-note.dto';
import { CreateMedicationOrderDto } from './dto/create-medication-order.dto';
import { AdministerMedicationDto } from './dto/administer-medication.dto';
import { SearchAdmissionDto } from './dto/search-admission.dto';

@Injectable()
export class AdmissionsService {
    constructor(
        @InjectModel(Admission.name) private admissionModel: Model<AdmissionDocument>,
        @InjectModel(Bed.name) private bedModel: Model<BedDocument>,
        @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
        @InjectModel(AdmissionVitalsLog.name) private vitalsLogModel: Model<AdmissionVitalsLogDocument>,
        @InjectModel(AdmissionRoundNote.name) private roundNoteModel: Model<AdmissionRoundNoteDocument>,
        @InjectModel(AdmissionMedicationOrder.name)
        private medicationOrderModel: Model<AdmissionMedicationOrderDocument>,
    ){}

    // ---------- Admit ----------

    async admit(dto: CreateAdmissionDto, admittingDoctorId: string): Promise<AdmissionDocument> {
    const patient = await this.patientModel.findById(dto.patientId);
    if (!patient) throw new NotFoundException('Patient record not found');

    // Atomic check-and-set: only succeeds if the bed is currently VACANT.
    // This is the same "let the DB resolve the race" pattern used for
    // appointment slot booking - two simultaneous admit requests for the
    // same bed can't both succeed.
    const bed = await this.bedModel.findOneAndUpdate(
      { _id: dto.bedId, wardId: dto.wardId, status: BedStatus.VACANT },
      { status: BedStatus.OCCUPIED },
      { new: true },
    );
    if (!bed) throw new ConflictException('This bed is not available');

    try {
      return await this.admissionModel.create({
        patientId: patient._id,
        patientUserId: patient.userId ?? null,
        appointmentId: dto.appointmentId ?? null,
        admittingDoctorId,
        wardId: dto.wardId,
        bedId: dto.bedId,
        admissionType: dto.admissionType,
        reasonForAdmission: dto.reasonForAdmission,
        provisionalDiagnosis: dto.provisionalDiagnosis,
      });
    } catch (err: any) {
      // Roll back the bed flip if admission creation somehow fails after
      // the bed was already claimed (e.g. validation error) - the bed
      // shouldn't get stuck OCCUPIED with no admission behind it.
      await this.bedModel.findByIdAndUpdate(bed._id, { status: BedStatus.VACANT });
      throw err;
    }
  }

  // ---------- Reads ----------

  async search(query: SearchAdmissionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.wardId) filter.wardId = query.wardId;
    if (query.patientId) filter.patientId = query.patientId;

    const [items, total] = await Promise.all([
      this.admissionModel
        .find(filter)
        .sort({ admissionDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patientId', 'name uhid phone')
        .populate('admittingDoctorId', 'name department')
        .populate('wardId', 'name type')
        .populate('bedId', 'bedNumber'),
      this.admissionModel.countDocuments(filter),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<AdmissionDocument> {
    const admission = await this.admissionModel
      .findById(id)
      .populate('patientId', 'name uhid phone dob gender allergies')
      .populate('admittingDoctorId', 'name department')
      .populate('wardId', 'name type')
      .populate('bedId', 'bedNumber');
    if (!admission) throw new NotFoundException('Admission not found');
    return admission;
  }

  findMyAdmissions(userId: string) {
    return this.admissionModel
      .find({ patientUserId: userId })
      .sort({ admissionDate: -1 })
      .populate('wardId', 'name type')
      .populate('bedId', 'bedNumber');
  }

  private async getActiveOrThrow(id: string): Promise<AdmissionDocument> {
    const admission = await this.admissionModel.findById(id);
    if (!admission) throw new NotFoundException('Admission not found');
    if (admission.status !== AdmissionStatus.ADMITTED) {
      throw new BadRequestException('This admission has already been discharged');
    }
    return admission;
  }

  // ---------- Transfer ----------

  async transfer(id: string, dto: TransferAdmissionDto, transferredBy: string): Promise<AdmissionDocument> {
    const admission = await this.getActiveOrThrow(id);

    const newBed = await this.bedModel.findOneAndUpdate(
      { _id: dto.toBedId, wardId: dto.toWardId, status: BedStatus.VACANT },
      { status: BedStatus.OCCUPIED },
      { new: true },
    );
    if (!newBed) throw new ConflictException('Destination bed is not available');

    const oldWardId = admission.wardId;
    const oldBedId = admission.bedId;

    // Old bed goes to CLEANING, not straight back to VACANT - it needs to
    // be turned over before the next patient, matching the Bed schema's
    // documented status meaning.
    await this.bedModel.findByIdAndUpdate(oldBedId, { status: BedStatus.CLEANING });

    admission.transferHistory.push({
      fromWardId: oldWardId,
      fromBedId: oldBedId,
      toWardId: dto.toWardId,
      toBedId: dto.toBedId,
      transferredBy: transferredBy as any,
      transferredAt: new Date(),
      reason: dto.reason,
    } as any);
    admission.wardId = dto.toWardId as any;
    admission.bedId = dto.toBedId as any;
    await admission.save();

    return admission;
  }

  // ---------- Discharge ----------

  async discharge(id: string, dto: DischargeAdmissionDto, dischargedBy: string): Promise<AdmissionDocument> {
    const admission = await this.getActiveOrThrow(id);

    admission.status = AdmissionStatus.DISCHARGED;
    admission.dischargeDate = new Date();
    admission.dischargeSummary = {
      finalDiagnosis: dto.finalDiagnosis,
      summary: dto.summary,
      followUpInstructions: dto.followUpInstructions,
      dischargedBy: dischargedBy as any,
      nurseChecklistCompleted: admission.dischargeSummary?.nurseChecklistCompleted ?? false,
    } as any;
    await admission.save();

    await this.bedModel.findByIdAndUpdate(admission.bedId, { status: BedStatus.CLEANING });
    return admission;
  }

  async completeNurseDischargeChecklist(id: string): Promise<AdmissionDocument> {
    const admission = await this.admissionModel.findById(id);
    if (!admission) throw new NotFoundException('Admission not found');
    if (!admission.dischargeSummary) {
      admission.dischargeSummary = { nurseChecklistCompleted: true } as any;
    } else {
      admission.dischargeSummary.nurseChecklistCompleted = true;
    }
    return admission.save();
  }

  // ---------- Vitals log (nurse charting) ----------

  addVitalsLog(admissionId: string, dto: AddVitalsLogDto, recordedBy: string) {
    return this.vitalsLogModel.create({ admissionId, ...dto, recordedBy });
  }

  getVitalsLogs(admissionId: string) {
    return this.vitalsLogModel.find({ admissionId }).sort({ recordedAt: -1 });
  }

  // ---------- Doctor rounds notes ----------

  addRoundNote(admissionId: string, dto: AddRoundNoteDto, doctorId: string) {
    return this.roundNoteModel.create({ admissionId, note: dto.note, doctorId });
  }

  getRoundNotes(admissionId: string) {
    return this.roundNoteModel.find({ admissionId }).sort({ createdAt: -1 }).populate('doctorId', 'name');
  }

  // ---------- Medication orders / MAR ----------

  createMedicationOrder(admissionId: string, dto: CreateMedicationOrderDto, orderedBy: string) {
    return this.medicationOrderModel.create({ admissionId, ...dto, orderedBy });
  }

  getMedicationOrders(admissionId: string) {
    return this.medicationOrderModel.find({ admissionId }).sort({ createdAt: -1 });
  }

  async administerMedication(
    admissionId: string,
    orderId: string,
    dto: AdministerMedicationDto,
    administeredBy: string,
  ): Promise<AdmissionMedicationOrderDocument> {
    const order = await this.medicationOrderModel.findOne({ _id: orderId, admissionId });
    if (!order) throw new NotFoundException('Medication order not found');
    order.administrations.push({
      administeredAt: new Date(),
      status: dto.status,
      administeredBy: administeredBy as any,
      notes: dto.notes,
    } as any);
    return order.save();
  }
}
