import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsMongoId, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

class DispenseLineDto {
  // Which prescribed line this dispense applies to - matches
  // Prescription.medicines[].lineId (the pharmacist's UI shows the
  // prescription's medicine names; this id is looked up from that line,
  // not typed by hand).
  @IsString()
  prescriptionLineId: string;

  @IsMongoId()
  medicineId: string; // the pharmacist's catalog match for this line's drug name

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class DispensePrescriptionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DispenseLineDto)
  items: DispenseLineDto[];
}
