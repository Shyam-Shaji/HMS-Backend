import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ResultFlag } from '../schemas/lab-order.schema';

class ResultParameterDto {
  @IsString() name: string;
  @IsString() value: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() referenceRangeLow?: number;
  @IsOptional() @IsNumber() referenceRangeHigh?: number;
  @IsOptional() @IsString() flag?: ResultFlag;
}

export class EnterResultDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultParameterDto)
  resultParameters?: ResultParameterDto[];

  @IsOptional()
  @IsString()
  resultNotes?: string;
}
