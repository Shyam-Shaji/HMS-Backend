import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { 
  NotificationPreference,
  NotificationPreferenceSchema,
 } from './schemas/notification-preference.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SmsProviderService } from './providers/sms-provider.service';
import { EmailProviderService } from './providers/email-provider.service';
import { PushProviderService } from './providers/push-provider.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsProviderService, EmailProviderService, PushProviderService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
