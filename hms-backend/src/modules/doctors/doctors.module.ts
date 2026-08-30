import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorAvailability, DoctorAvailabilitySchema } from './schemas/doctor-availability.schema';
import { DoctorLeave, DoctorLeaveSchema } from './schemas/doctor-leave.schema';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schema';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DoctorAvailability.name, schema: DoctorAvailabilitySchema },
      { name: DoctorLeave.name, schema: DoctorLeaveSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
