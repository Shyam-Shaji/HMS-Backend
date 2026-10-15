import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested, IsNumber, Min } from 'class-validator';

class PrescribedMedicineDto {
  @IsString() name: string;
  @IsString() dosage: string;
  @IsString() frequency: string;
  @IsString() duration: string;
  @IsOptional() @IsString() instructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

export class CreatePrescriptionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescribedMedicineDto)
  medicines: PrescribedMedicineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
