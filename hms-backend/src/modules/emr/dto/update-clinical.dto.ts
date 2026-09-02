import { Type } from "class-transformer";
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from "class-validator";

class DiagnosisDto {
    @IsString() description: string;
    @IsOptional() @IsString() icd10Code?: string;
}

class AttachmentDto {
    @IsString() type: string;
    @IsString() url: string;
}

// Doctor-only fields for the consultation screen.
export class UpdateClinicalDto {
  @IsOptional() @IsString() chiefComplaint?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosisDto)
  diagnosis?: DiagnosisDto[];

  @IsOptional() @IsString() doctorNotes?: string;
  @IsOptional() @IsDateString() followUpDate?: string;
  @IsOptional() @IsString() referredTo?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
