import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { Prescription, PrescriptionSchema } from '../prescriptions/schemas/prescription.schema';
import { DispenseRecord, DispenseRecordSchema } from '../pharmacy/schemas/dispense-record.schema';
import { Ward, WardSchema } from '../wards/schemas/ward.schema';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { CounterModule } from '../../common/counter/counter.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AdmissionsModule } from '../admissions/admissions.module';
import { LabModule } from '../lab/lab.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: Prescription.name, schema: PrescriptionSchema },
      { name: DispenseRecord.name, schema: DispenseRecordSchema },
      { name: Ward.name, schema: WardSchema },
    ]),
    CounterModule,
    AppointmentsModule,
    AdmissionsModule,
    LabModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, PaymentGatewayService],
  exports: [BillingService],
})
export class BillingModule {}
