import { IsString, Length } from "class-validator";

export class VerifyOtpDto {
    @IsString()
    identifier: string;

    @IsString()
    @Length(4,8)
    code: string;
}