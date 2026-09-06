import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
import { LabOrderPriority, LabOrderStatus } from '../schemas/lab-order.schema';

export class SearchLabOrderDto {
  @IsOptional() @IsEnum(LabOrderStatus) status?: LabOrderStatus;
  @IsOptional() @IsEnum(LabOrderPriority) priority?: LabOrderPriority;
  @IsOptional() @IsMongoId() patientId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
