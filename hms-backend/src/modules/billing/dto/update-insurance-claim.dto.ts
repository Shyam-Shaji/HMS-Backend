import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InsuranceClaimStatus } from '../schemas/invoice.schema';

export class UpdateInsuranceClaimDto {
  @IsEnum(InsuranceClaimStatus)
  status: InsuranceClaimStatus;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) approvedAmount?: number;
  @IsOptional() @IsString() notes?: string;
}
