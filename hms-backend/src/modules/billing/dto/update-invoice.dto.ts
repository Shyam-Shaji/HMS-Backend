import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { LineItemCategory } from '../schemas/invoice.schema';

class LineItemDto {
  @IsString() description: string;
  @IsEnum(LineItemCategory) category: LineItemCategory;
  @IsOptional() @IsString() referenceId?: string;
  @Type(() => Number) @IsNumber() @Min(0) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
}

// Only editable while status = DRAFT (enforced in the service) - a line
// items replace-all, same "simpler than diffing" reasoning as the
// doctor's weekly availability update.
export class UpdateInvoiceDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tax?: number;
}
