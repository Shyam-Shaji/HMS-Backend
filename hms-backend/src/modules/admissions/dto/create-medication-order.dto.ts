import { IsString } from 'class-validator';

export class CreateMedicationOrderDto {
  @IsString() medicineName: string;
  @IsString() dosage: string;
  @IsString() route: string;
  @IsString() frequency: string;
}
