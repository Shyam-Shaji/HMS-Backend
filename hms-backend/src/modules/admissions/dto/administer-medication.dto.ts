import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AdministrationStatus } from '../schemas/admission-medication-order.schema';

export class AdministerMedicationDto {
  @IsEnum(AdministrationStatus)
  status: AdministrationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
