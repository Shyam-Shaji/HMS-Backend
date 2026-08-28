import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Patient, PatientSchema } from './schemas/patient.schema';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { CounterModule } from '../../common/counter/counter.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]), CounterModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
