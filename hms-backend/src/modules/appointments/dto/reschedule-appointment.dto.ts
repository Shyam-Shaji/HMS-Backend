import { IsDateString, IsString } from "class-validator";

export class RescheduleAppointmentDto {
    @IsDateString()
    date: string;

    @IsString()
    time: string;
}