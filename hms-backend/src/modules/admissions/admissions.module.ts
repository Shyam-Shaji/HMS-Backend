import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admission, AdmissionSchema } from './schemas/admission.schema';
import { AdmissionVitalsLog, AdmissionVitalsLogSchema } from './schemas/admission-vitals-log.schema';
import { AdmissionRoundNote, AdmissionRoundNoteSchema } from './schemas/admission-round-note.schema';
import { 
  AdmissionMedicationOrder, 
  AdmissionMedicationOrderSchema 
} from './schemas/admission-medication-order.schema';
import { Bed, BedSchema } from '../wards/schemas/bed.schema';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';
import { WardsModule } from '../wards/wards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admission.name, schema: AdmissionSchema },
      { name: AdmissionVitalsLog.name, schema: AdmissionVitalsLogSchema },
      { name: AdmissionRoundNote.name, schema: AdmissionRoundNoteSchema },
      { name: AdmissionMedicationOrder.name, schema: AdmissionMedicationOrderSchema },
      { name: Bed.name, schema: BedSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
    ]),
    WardsModule,
    NotificationsModule,
  ],
  controllers: [AdmissionsController],
  providers: [AdmissionsService],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
