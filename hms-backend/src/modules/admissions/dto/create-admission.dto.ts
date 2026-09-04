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
}
