import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested, ValidateIf } from 'class-validator';
import { ResultType } from '../schemas/test-catalog.schema';

class ParameterDefinitionDto {
  @IsString() name: string;
  @IsString() unit: string;
  @IsOptional() @IsNumber() referenceRangeLow?: number;
  @IsOptional() @IsNumber() referenceRangeHigh?: number;
}

export class CreateTestCatalogDto {
  @IsString() name: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() category?: string;
  @IsString() sampleType: string;

  @IsEnum(ResultType)
  resultType: ResultType;

  @ValidateIf((o) => o.resultType === ResultType.STRUCTURED)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParameterDefinitionDto)
  parameters?: ParameterDefinitionDto[];

  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(1) turnaroundTimeHours?: number;
}
