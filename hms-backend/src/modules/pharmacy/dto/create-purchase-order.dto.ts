import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsMongoId, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

class PurchaseOrderItemDto {
  @IsMongoId() medicineId: string;
  @Type(() => Number) @IsNumber() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) estimatedUnitPrice: number;
}

export class CreatePurchaseOrderDto {
  @IsMongoId()
  supplierId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;
}
