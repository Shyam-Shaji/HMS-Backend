import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

// Consultation fee isn't stored anywhere yet (no per-doctor fee field
// exists on the User/Doctor model in the current schema), so it's
// supplied by billing staff at generation time rather than looked up.
// A future phase could add a `consultationFee` field to the Doctor's
// profile and default this from there.
export class GenerateFromAppointmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultationFee?: number;
}
