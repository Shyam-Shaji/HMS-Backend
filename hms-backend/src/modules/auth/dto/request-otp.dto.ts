import { IsString } from "class-validator";

export class RequestOtpDto {
    @IsString()
    identifier: string; // email or phone
}