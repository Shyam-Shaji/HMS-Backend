import { IsString } from 'class-validator';

export class AddRoundNoteDto {
  @IsString()
  note: string;
}
