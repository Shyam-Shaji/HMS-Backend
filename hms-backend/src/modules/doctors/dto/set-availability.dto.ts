import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class AvailabilityBlockDto {
  @IsInt() @Min(0) @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional() @IsInt() @Min(5)
  slotDurationMinutes?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// Replaces the doctor's whole weekly schedule in one call - simpler and
// less error-prone for the frontend than diffing individual blocks.
export class SetAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityBlockDto)
  blocks: AvailabilityBlockDto[];
}
