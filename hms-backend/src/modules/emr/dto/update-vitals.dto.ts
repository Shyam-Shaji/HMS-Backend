import { IsNumber, IsOptional } from 'class-validator';

// A focused DTO for the Nurse Vitals Entry screen - deliberately does NOT
// include chiefComplaint/diagnosis/notes, which are doctor-only fields.
export class UpdateVitalsDto {
  @IsOptional() @IsNumber() heightCm?: number;
  @IsOptional() @IsNumber() weightKg?: number;
  @IsOptional() @IsNumber() temperatureC?: number;
  @IsOptional() @IsNumber() bloodPressureSystolic?: number;
  @IsOptional() @IsNumber() bloodPressureDiastolic?: number;
  @IsOptional() @IsNumber() pulseRate?: number;
  @IsOptional() @IsNumber() respiratoryRate?: number;
  @IsOptional() @IsNumber() spo2?: number;
}
