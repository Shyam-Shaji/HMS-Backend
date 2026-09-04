import { IsString } from 'class-validator';

export class CreateBedDto {
  @IsString()
  bedNumber: string;
}
