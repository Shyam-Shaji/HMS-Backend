import { IsOptional, IsString } from 'class-validator';

export class DischargeAdmissionDto {
  @IsOptional() @IsString() finalDiagnosis?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() followUpInstructions?: string;
}
