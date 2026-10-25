import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { AdmissionType } from '../schemas/admission.schema';

export class CreateAdmissionDto {
  @IsMongoId()
  patientId: string;

  @IsMongoId()
  wardId: string;

  @IsMongoId()
  bedId: string;

  @IsEnum(AdmissionType)
  admissionType: AdmissionType;

  @IsOptional()
  @IsString()
  reasonForAdmission?: string;

  @IsOptional()
  @IsString()
  provisionalDiagnosis?: string;

  @IsOptional()
  @IsMongoId()
  appointmentId?: string;

  // Who is responsible for this patient. Optional when a doctor admits
  // (defaults to themselves); REQUIRED when a nurse admits, so the record
  // never names a nurse as the admitting doctor.
  @IsOptional()
  @IsMongoId()
  admittingDoctorId?: string;
}
