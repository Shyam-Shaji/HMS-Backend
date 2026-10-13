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
import { User, UserDocument } from '../user/schemas/user.schema';
import { Role } from 'src/common/enums/role.enums';

export interface SlotResult {
    time: string;
    available: boolean;
}

export interface DoctorDirectoryQuery {
  hospitalId: string;
  department?: string;
  q?: string;
}

@Injectable()
export class DoctorsService {
    constructor(
        @InjectModel(DoctorAvailability.name) private availabilityModel: Model<DoctorAvailabilityDocument>,
        @InjectModel(DoctorLeave.name) private leaveModel: Model<DoctorLeaveDocument>,
        @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) {}

    // The "search doctors by department/hospital" read patients need before
    // they can book anything - there was previously no way to discover a
    // doctor at all. hospitalId is required explicitly (not read from
    // context) because a patient's own JWT carries hospitalId: null - they
    // browse across hospitals, not within one fixed tenant.
    listDirectory(query: DoctorDirectoryQuery){
        const filter:any = {hospitalId: query.hospitalId, role: Role.DOCTOR, isActive: true};
        if(query.department) filter.department = new RegExp(query.department, 'i');
        if(query.q) filter.name = new RegExp(query.q, 'i');
        return this.userModel.find(filter).select('name department');
    }
    
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
