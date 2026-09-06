import { IsString } from 'class-validator';

export class UploadReportDto {
  @IsString()
  reportFileUrl: string;
}
