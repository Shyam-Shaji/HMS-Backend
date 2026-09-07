import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

// For in-person payments only (cash/card/UPI/bank transfer collected via
// the hospital's own terminal/process). Online gateway payments go
// through initiate/confirm instead - see PaymentGatewayService.
export class RecordPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  transactionRef?: string;
}
