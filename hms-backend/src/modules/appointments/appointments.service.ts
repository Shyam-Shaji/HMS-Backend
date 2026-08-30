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
export class AppointmentsService {}

