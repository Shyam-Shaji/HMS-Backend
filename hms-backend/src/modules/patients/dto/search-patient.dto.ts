import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class SearchPatientDto {
    @IsOptional()
    @IsString()
    q?: string; // matches against name, phone, uhid

    @IsOptional()
    @Type(()=> Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}