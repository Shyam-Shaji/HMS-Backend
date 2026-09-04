import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
import { AdmissionStatus } from '../schemas/admission.schema';

export class SearchAdmissionDto {
  @IsOptional() @IsEnum(AdmissionStatus) status?: AdmissionStatus;
  @IsOptional() @IsMongoId() wardId?: string;
  @IsOptional() @IsMongoId() patientId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
