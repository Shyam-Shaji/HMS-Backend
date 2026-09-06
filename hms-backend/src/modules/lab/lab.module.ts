import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestCatalog, TestCatalogSchema } from './schemas/test-catalog.schema';
import { LabOrder, LabOrderSchema } from './schemas/lab-order.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AdmissionsModule } from '../admissions/admissions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TestCatalog.name, schema: TestCatalogSchema },
      { name: LabOrder.name, schema: LabOrderSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
    AppointmentsModule,
    AdmissionsModule,
  ],
  controllers: [LabController],
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
