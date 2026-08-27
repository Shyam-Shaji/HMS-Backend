import { PartialType } from "@nestjs/swagger";
import { CreateHospitalDto } from "./create-hospital.dto";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateHospitalDto extends PartialType(CreateHospitalDto){
  @IsOptional()
  @IsArray()
  modulesEnabled?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  subscriptionPlan?: string;
}