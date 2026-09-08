import { IsArray, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { NotificationChannel, NotificationType } from '../schemas/notification.schema';

// For staff-triggered custom notifications (e.g. a hospital admin
// broadcasting a message to one patient). Automated events elsewhere in
// the app call NotificationsService.send() directly rather than this
// HTTP route.
export class SendNotificationDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}
