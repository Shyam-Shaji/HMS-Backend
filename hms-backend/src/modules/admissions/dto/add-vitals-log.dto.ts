import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AddVitalsLogDto {
  @IsOptional() @IsNumber() temperatureC?: number;
  @IsOptional() @IsNumber() bloodPressureSystolic?: number;
  @IsOptional() @IsNumber() bloodPressureDiastolic?: number;
  @IsOptional() @IsNumber() pulseRate?: number;
  @IsOptional() @IsNumber() respiratoryRate?: number;
  @IsOptional() @IsNumber() spo2?: number;
  @IsOptional() @IsString() notes?: string;
}
