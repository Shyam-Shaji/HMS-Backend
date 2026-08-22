import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

// Public self-registration is for PATIENTS only. Staff account are
// created by Hospital Admin / Super Admin via POST /user(see UserController).

export class RegisterDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    password?: string; // optional - patient may prefer OTP-only login
}