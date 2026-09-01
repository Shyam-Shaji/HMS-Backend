import { 
    Injectable,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument, AppointmentStatus } from './schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { SearchAppointmentDto } from './dto/search-appointment.dto';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { CounterService } from '../../common/counter/counter.service';
import { DoctorsService } from '../doctors/doctors.service';
import { AppointmentsGateway } from './appointments.gateway';
import { combineDateAndTime, startOfDay } from '../../common/utils/date.util';
import { getCurrentHospitalId } from '../../common/context/tenant-context';

const ACTIVE_STATUSES = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_CONSULTATION,
];

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private readonly counterService: CounterService,
    private readonly doctorsService: DoctorsService,
    private readonly gateway: AppointmentsGateway,
  ){}

  // ---------- Booking ----------

  async book(dto: CreateAppointmentDto, bookedByUserId: string): Promise<AppointmentDocument> {
    const hospitalId = getCurrentHospitalId();
    if(!hospitalId) throw new BadRequestException('Hospital context is required to book an appointment');

    const patient = await this.patientModel.findById(dto.patientId);
    if(!patient) throw new NotFoundException('Patient record not found');

    const slots = await this.doctorsService.getAvailableSlots(dto.doctorId, dto.date);
    const slot = slots.find((s)=> s.time === dto.time);
    if(!slot) throw new BadRequestException('That time is not a valid slot for this doctor');
    if(!slot.available) throw new ConflictException('This slot was just booked. Please pick another time');

    const tokenNumber = await this.counterService.next(`token:${hospitalId}:${dto.doctorId}:${dto.date}`);

    try{
      return await this.appointmentModel.create({
        patientId: patient._id,
        patientUserId: patient.userId ?? null,
        doctorId: dto.doctorId,
        scheduledDate: startOfDay(dto.date),
        scheduledTime: dto.time,
        scheduledAt: combineDateAndTime(dto.date, dto.time),
        tokenNumber,
        type: dto.type,
        reason: dto.reason,
        bookedBy: bookedByUserId,
      });
    } catch(err: any){
      // Race condition: two requests passed the availability check for the
      // same slot before either committed. The partial unique index on
      // the schema is the real guard; this just turns the raw Mongo
      // duplicate-key error into a clean, expected API response.
      if(err?.code === 11000){
        throw new ConflictException('This slot was just booked. Please pick another time.');
      }
      throw err;
    } finally {
      await this.pushQueueUpdate(hospitalId, dto.doctorId, dto.date);
    }
  }

  // ---------- Reads ----------

  async search(query: SearchAppointmentDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: any = {};
    if(query.doctorId) filter.doctorId = query.doctorId;
    if(query.patientId) filter.patientId = query.patientId;
    if(query.status) filter.status = query.status;
    if(query.date) filter.scheduledDate = startOfDay(query.date);

    const [items, total] = await Promise.all([
      this.appointmentModel
      .find(filter)
      .sort({scheduleAt: 1})
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('patientId', 'name uhid phone')
      .populate('doctorId', 'name department'),
      this.appointmentModel.countDocuments(filter),
    ]);

    return {items,total,page, limit, totalPages: Math.ceil(total/limit)};
  }

  async findById(id: string): Promise<AppointmentDocument> {
    const appt = await this.appointmentModel
    .findById(id)
    .populate('patientId', 'name uhid phone')
    .populate('doctorId', 'name department');
    if(!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  findMyAppointments(userId: string) {
    return this.appointmentModel
    .find({patientUserId: userId})
    .sort({scheduleAt: -1})
    .populate('doctorId', 'name department');
  }

  // The core "live queue" read: everyone waiting for this doctor today,
  // in token order, plus who's currently being seen. Used both by the 
  // waiting-room board (poll or socket) and the patient's status screen.
  async getQueue(doctorId: string, dateStr: string) {
    const appointments = await this.appointmentModel
    .find({
      doctorId,
      scheduledDate: startOfDay(dateStr),
      status: { $in: ACTIVE_STATUSES},
    })
    .sort({tokenNumber: 1})
    .populate('patientId', 'name uhid');

    const nowServing = appointments.find((a)=> a.status === AppointmentStatus.IN_CONSULTATION);
    const waiting = appointments.filter((a)=> a.status !== AppointmentStatus.IN_CONSULTATION);

    return {
      date: dateStr,
      nowServingToken: nowServing?.tokenNumber ?? null,
      waitingCount: waiting.length,
      queue: appointments,
    };
  }

  // ---------- Status transitions ----------

  async reschedule(id: string, dto: RescheduleAppointmentDto, actingUserId: string): Promise<AppointmentDocument> {
    const appt = await this.getActiveOrThrow(id);
    const hospitalId = getCurrentHospitalId();

    const slots = await this.doctorsService.getAvailableSlots(appt.doctorId.toString(), dto.date);
    const slot = slots.find((s)=> s.time === dto.time);
    if(!slot?.available) throw new ConflictException('That slot is not available');

    const oldDate = appt.scheduledDate.toISOString().slice(0, 10);
    appt.scheduledDate = startOfDay(dto.date);
    appt.scheduledTime = dto.time;
    appt.scheduledAt = combineDateAndTime(dto.date, dto.time);
    appt.status = AppointmentStatus.BOOKED;
    await appt.save();

    if(hospitalId){
      await this.pushQueueUpdate(hospitalId, appt.doctorId.toString(), oldDate);
      await this.pushQueueUpdate(hospitalId, appt.doctorId.toString(), dto.date);
    }
    return appt;
  }

  async cancel(id: string, dto: CancelAppointmentDto, cancelledBy: string): Promise<AppointmentDocument> {
    const appt = await this.getActiveOrThrow(id);
    appt.status = AppointmentStatus.CANCELLED;
    appt.cancelReason = dto.reason;
    appt.cancelledBy = cancelledBy as any;
    await appt.save();
    await this.emitQueueUpdateForAppointment(appt);
    return appt;
  }

  async checkIn(id: string): Promise<AppointmentDocument> {
    const appt = await this.getActiveOrThrow(id);
    if (appt.status !== AppointmentStatus.BOOKED) {
      throw new BadRequestException(`Cannot check in an appointment with status "${appt.status}"`);
    }
    appt.status = AppointmentStatus.CHECKED_IN;
    appt.checkInTime = new Date();
    await appt.save();
    await this.emitQueueUpdateForAppointment(appt);
    return appt;
  }

  async startConsultation(id: string): Promise<AppointmentDocument> {
    const appt = await this.getActiveOrThrow(id);
    if (appt.status !== AppointmentStatus.CHECKED_IN) {
      throw new BadRequestException('Patient must be checked in before starting consultation');
    }
    appt.status = AppointmentStatus.IN_CONSULTATION;
    appt.consultationStartTime = new Date();
    await appt.save();
    await this.emitQueueUpdateForAppointment(appt);
    return appt;
  }

  async complete(id: string): Promise<AppointmentDocument> {
    const appt = await this.getActiveOrThrow(id);
    if (appt.status !== AppointmentStatus.IN_CONSULTATION) {
      throw new BadRequestException('Only an in-progress consultation can be completed');
    }
    appt.status = AppointmentStatus.COMPLETED;
    appt.consultationEndTime = new Date();
    await appt.save();
    await this.emitQueueUpdateForAppointment(appt);
    return appt;
  }

  async markNoShow(id: string): Promise<AppointmentDocument> {
    const appt = await this.getActiveOrThrow(id);
    appt.status = AppointmentStatus.NO_SHOW;
    await appt.save();
    await this.emitQueueUpdateForAppointment(appt);
    return appt;
  }

  // ---------- helpers ----------

  private async getActiveOrThrow(id: string): Promise<AppointmentDocument> {
    const appt = await this.appointmentModel.findById(id);
    if(!appt) throw new NotFoundException('Appointment not found');
    if(appt.status === AppointmentStatus.CANCELLED){
      throw new ForbiddenException('This appointment is already cancelled');
    }
    return appt;
  }

  private async emitQueueUpdateForAppointment(appt: AppointmentDocument) {
    const hospitalId = getCurrentHospitalId() ?? (appt as any).hospitalId?.toString();
    if(!hospitalId) return;
    const dateStr = appt.scheduledDate.toISOString().slice(0,10);
    await this.pushQueueUpdate(hospitalId, appt.doctorId.toString(), dateStr);
  }

  private async pushQueueUpdate(hospitalId: string, doctorId: string, dateStr: string) {
    const queue = await this.getQueue(doctorId, dateStr);
    this.gateway.broadcastQueueUpdate(hospitalId, doctorId, dateStr, queue);
  }
}

