import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DoctorAvailability, DoctorAvailabilityDocument } from './schemas/doctor-availability.schema';
import { DoctorLeave, DoctorLeaveDocument } from './schemas/doctor-leave.schema';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { 
    generateSlots,
    getDayOfWeek,
    startOfDay,
    endOfDay,
    timeToMinutes,
} from '../../common/utils/date.util';
import { Appointment, AppointmentDocument, AppointmentStatus } from '../appointments/schemas/appointment.schema';

export interface SlotResult {
    time: string;
    available: boolean;
}

@Injectable()
export class DoctorsService {
    constructor(
        @InjectModel(DoctorAvailability.name) private availabilityModel: Model<DoctorAvailabilityDocument>,
        @InjectModel(DoctorLeave.name) private leaveModel: Model<DoctorLeaveDocument>,
        @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
    ) {}

    async setAvailability(doctorId: string, dto: SetAvailabilityDto){
        await this.availabilityModel.deleteMany({ doctorId});
        const docs = dto.blocks.map((b)=> ({...b, doctorId}));
        return this.availabilityModel.insertMany(docs);
    }

    getAvailability(doctorId: string){
        return this.availabilityModel.find({doctorId}).sort({dayOfWeek: 1, startTime: 1});
    }

    createLeave(doctorId: string, dto: CreateLeaveDto){
        return this.leaveModel.create({...dto, doctorId, date: startOfDay(dto.date)});
    }

    getLeave(doctorId: string){
        return this.leaveModel.find({doctorId}).sort({date: 1});
    }

    // Core slot-computation used by the booking screen: weekly availability
  // minus leave/blocks minus already-booked appointments for that date.
  async getAvailableSlots(doctorId: string, dateStr: string): Promise<SlotResult[]> {
    const dayOfWeek = getDayOfWeek(dateStr);

    const [blocks, leaves, existingAppointments] = await Promise.all([
        this.availabilityModel.find({doctorId, dayOfWeek, isActive: true}),
        this.leaveModel.find({doctorId, date: { $gte: startOfDay(dateStr), $lte: endOfDay(dateStr)}}),
        this.appointmentModel.find({
            doctorId,
            scheduleAt: { $gte: startOfDay(dateStr), $lte: endOfDay(dateStr)},
            status: { $in: [AppointmentStatus.BOOKED, AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_CONSULTATION]},
        }),
    ]);

    const fullDayBlocked = leaves.some((l) => !l.fromTime && !l.toTime);
    if(fullDayBlocked || blocks.length === 0) return [];

    const boockedTimes = new Set(existingAppointments.map((a)=> a.scheduledTime));

    const allSlots = blocks.flatMap((b) => generateSlots(b.startTime, b.endTime, b.slotDurationMinutes));

    return allSlots
    .filter((slot)=>{
        const slotMinutes = timeToMinutes(slot);
        const withinLeaveBlock = leaves.some((l) => {
            if(!l.fromTime || !l.toTime) return false;
            return slotMinutes >= timeToMinutes(l.fromTime) && slotMinutes < timeToMinutes(l.toTime);
        });
        return !withinLeaveBlock;
    })
    .sort((a,b) => timeToMinutes(a) - timeToMinutes(b))
    .map((time) => ({time, available: !boockedTimes.has(time)}));
  }
}
