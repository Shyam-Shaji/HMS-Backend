import { IsEmail, IsEnum, IsMongoId, IsOptional, IsString, MinLength, ValidateIf } from "class-validator";
import { Role } from "../../../common/enums/role.enums";

export class CreateUserDto {
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
    password?: string;

    @IsEnum(Role)
    role: Role;

    // Required for every role except SUPER_ADMIN / PATIENT (validated in service)
    @ValidateIf((o) => o.role !== Role.SUPER_ADMIN && o.role !== Role.PATIENT)
    @IsMongoId()
    hospitalId?: string;

    @IsOptional()
    @IsString()
    department?: string;
}