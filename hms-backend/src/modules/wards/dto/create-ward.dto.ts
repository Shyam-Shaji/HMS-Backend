import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { WardType } from '../schemas/ward.schema';

export class CreateWardDto {
  @IsString()
  name: string;

  @IsEnum(WardType)
  type: WardType;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  chargesPerDay?: number;
}
