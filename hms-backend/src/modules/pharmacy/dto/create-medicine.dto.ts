import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMedicineDto {
  @IsString() name: string;
  @IsOptional() @IsString() genericName?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() category?: string;
  @IsString() unit: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;
}
