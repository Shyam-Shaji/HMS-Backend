import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateLeaveDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  fromTime?: string;

  @IsOptional()
  @IsString()
  toTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
