import { IsOptional, IsString } from 'class-validator';

export class SearchMedicineDto {
  @IsOptional()
  @IsString()
  q?: string;
}
