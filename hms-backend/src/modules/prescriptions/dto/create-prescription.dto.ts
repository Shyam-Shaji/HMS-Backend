import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class PrescribedMedicineDto {
  @IsString() name: string;
  @IsString() dosage: string;
  @IsString() frequency: string;
  @IsString() duration: string;
  @IsOptional() @IsString() instructions?: string;
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
