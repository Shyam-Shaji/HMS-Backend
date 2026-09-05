import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsMongoId, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

class ReceivedItemDto {
  @IsMongoId() medicineId: string;
  @IsString() batchNumber: string;
  @IsDateString() expiryDate: string;
  @Type(() => Number) @IsInt() @Min(1) quantityReceived: number;
  @Type(() => Number) @IsNumber() @Min(0) pricePerUnit: number;
}

// The batch details (batch number, expiry, actual quantity/price received)
// are only known when the delivery physically arrives - this is what
// actually creates stock, not the original PurchaseOrder.
export class ReceivePurchaseOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  items: ReceivedItemDto[];
}
