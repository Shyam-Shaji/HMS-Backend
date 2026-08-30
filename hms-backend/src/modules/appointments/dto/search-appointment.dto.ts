import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsMongoId, IsOptional, Min } from "class-validator";
import { AppointmentStatus } from "../schemas/appointment.schema";

export class SearchAppointmentDto {
  @IsOptional() @IsMongoId()
  doctorId?: string;

  @IsOptional() @IsMongoId()
  patientId?: string;

  @IsOptional() @IsDateString()
  date?: string;

  @IsOptional() @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 20;
}