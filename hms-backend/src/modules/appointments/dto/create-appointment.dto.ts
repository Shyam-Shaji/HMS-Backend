import { IsDateString, IsEnum, IsMongoId, IsOptional, IsString } from "class-validator";
import { AppointmentType } from "../schemas/appointment.schema";

export class CreateAppointmentDto {
    @IsMongoId()
    patientId: string;

    @IsMongoId()
    doctorId: string;

    @IsDateString()
    date: string; // "YYYY-MM-DD"

    @IsString()
    time: string; // "HH:mm" - must be one of the doctor's available slots

    @IsOptional()
    @IsEnum(AppointmentType)
    type?: AppointmentType;

    @IsOptional()
    @IsString()
    reason?: string;
}