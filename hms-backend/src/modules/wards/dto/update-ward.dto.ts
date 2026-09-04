import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateWardDto } from './create-ward.dto';

export class UpdateWardDto extends PartialType(CreateWardDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
