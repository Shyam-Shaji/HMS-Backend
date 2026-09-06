import { IsOptional, IsString } from 'class-validator';

export class SearchTestCatalogDto {
  @IsOptional()
  @IsString()
  q?: string;
}
