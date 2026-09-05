import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddBatchDto {
  @IsString() batchNumber: string;
  @IsDateString() expiryDate: string;
  @IsInt() @Min(1) quantityReceived: number;
  @IsNumber() @Min(0) pricePerUnit: number;
  @IsOptional() @IsString() supplier?: string;
}
