import { IsOptional, IsString } from 'class-validator';

export class CancelLabOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
