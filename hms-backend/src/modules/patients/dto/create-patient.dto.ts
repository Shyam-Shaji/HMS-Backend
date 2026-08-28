import { Type } from "class-transformer";
import { IsArray,
    IsDateString,
    IsEmail,
    IsEnum,
    IsMongoId,
    IsOptional,
    IsString,
    ValidateNested,
 } from "class-validator";
 import { BloodGroup, Gender } from "../schemas/patient.schema";

 class EmergencyContactDto {
    @IsString() name: string;
    @IsString() phone: string;
    @IsOptional() @IsString() relation?: string;
 }

 class InsuranceDto{
    @IsString() provider: string;
    @IsString() policyNumber: string;
    @IsOptional() @IsDateString() validTill?: string;
 }

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsDateString()
  dob: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => InsuranceDto)
  insurance?: InsuranceDto;

  // Set when reception is registering someone who already has a patient
  // portal account (matched by phone/email lookup on the frontend before
  // submitting) so this hospital's record links to their global identity.
  @IsOptional()
  @IsMongoId()
  userId?: string;
}