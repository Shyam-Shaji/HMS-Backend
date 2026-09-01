import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsGateway } from './appointments.gateway';
import { CounterModule } from '../../common/counter/counter.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
    CounterModule,
    // DoctorsModule imports the Appointment schema directly (for slot
    // computation) rather than this whole module, so there's no circular
    // dependency here despite AppointmentsService depending on DoctorsService.
    DoctorsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsGateway],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
