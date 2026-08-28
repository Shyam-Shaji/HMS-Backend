import { IsMongoId } from "class-validator";

export class LinkUserDto{
    @IsMongoId()
    userId: string;
}