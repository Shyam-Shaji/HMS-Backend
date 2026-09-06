import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTestCatalogDto } from './create-test-catalog.dto';

export class UpdateTestCatalogDto extends PartialType(CreateTestCatalogDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
