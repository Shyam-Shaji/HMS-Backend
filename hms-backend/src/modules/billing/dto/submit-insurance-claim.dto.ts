import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class SubmitInsuranceClaimDto {
  @IsString() provider: string;
  @IsString() policyNumber: string;
  @Type(() => Number) @IsNumber() @Min(0) claimedAmount: number;
}
