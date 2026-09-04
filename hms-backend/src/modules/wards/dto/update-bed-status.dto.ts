import { IsEnum } from 'class-validator';
import { BedStatus } from '../schemas/bed.schema';

export class UpdateBedStatusDto {
  @IsEnum(BedStatus)
  status: BedStatus;
}
