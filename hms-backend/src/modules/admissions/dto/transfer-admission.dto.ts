import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class TransferAdmissionDto {
  @IsMongoId()
  toWardId: string;

  @IsMongoId()
  toBedId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
