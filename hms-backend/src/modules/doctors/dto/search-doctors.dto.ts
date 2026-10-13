import { IsMongoId, IsOptional, IsString } from "class-validator";

export class SearchDoctorsDto {
    @IsMongoId()
    hospitalId: string;

    @IsOptional()
    @IsString()
    department?: string;

    @IsOptional()
    @IsString()
    q?: string;
}