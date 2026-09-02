import { IsOptional, IsString } from 'class-validator';

export class CancelPrescriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
