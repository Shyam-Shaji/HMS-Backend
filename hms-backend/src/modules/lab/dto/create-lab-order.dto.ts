import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { LabOrderPriority } from '../schemas/lab-order.schema';

export class CreateLabOrderDto {
  @IsMongoId()
  testId: string;

  @IsOptional()
  @IsEnum(LabOrderPriority)
  priority?: LabOrderPriority;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;
}
