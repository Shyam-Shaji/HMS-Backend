import { IsString } from 'class-validator';

export class ConfirmOnlinePaymentDto {
  @IsString() gatewayPaymentId: string;
  @IsString() signature: string;
}
