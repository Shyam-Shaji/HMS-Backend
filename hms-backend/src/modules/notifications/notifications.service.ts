import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
    Notification,
    NotificationDocument,
    NotificationType,
    NotificationChannel,
    ChannelDeliveryStatus,
 } from './schemas/notification.schema';
import { 
    NotificationPreference,
    NotificationPreferenceDocument,
 } from './schemas/notification-preference.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { Role } from '../../common/enums/role.enums';
import { SmsProviderService } from './providers/sms-provider.service';
import { EmailProviderService } from './providers/email-provider.service';
import { PushProviderService } from './providers/push-provider.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { SearchNotificationsDto } from './dto/search-notifications.dto';

export interface SendNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[]; // defaults to [IN_APP, SMS, EMAIL]
  relatedEntityType?: string;
  relatedEntityId?: string;
}

const DEFAULT_CHANNELS = [NotificationChannel.IN_APP, NotificationChannel.SMS, NotificationChannel.EMAIL];

@Injectable()
export class NotificationsService {
    constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreference.name) private preferenceModel: Model<NotificationPreferenceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly smsProvider: SmsProviderService,
    private readonly emailProvider: EmailProviderService,
    private readonly pushProvider: PushProviderService,
  ) {}

  // The single entry point every other module calls. Looks up the
  // recipient's contact info + channel preferences, attempts delivery on
  // each requested channel, and always leaves an in-app inbox entry
  // regardless of preferences (IN_APP is never skipped) - see the schema
  // comment for why.
  async send(input: SendNotificationInput): Promise<NotificationDocument> {
    const user = await this.userModel.findById(input.userId);
    if (!user) throw new NotFoundException('Notification recipient not found');

    const preference = await this.preferenceModel.findOne({ userId: input.userId });
    const requestedChannels = input.channels ?? DEFAULT_CHANNELS;

    const deliveries: any[] = [];
    for (const channel of requestedChannels) {
      deliveries.push(await this.deliverOnChannel(channel, user, input, preference));
    }

    return this.notificationModel.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      channels: deliveries,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    });
  }

  private async deliverOnChannel(
    channel: NotificationChannel,
    user: UserDocument,
    input: SendNotificationInput,
    preference: NotificationPreferenceDocument | null,
  ) {
    if (channel === NotificationChannel.IN_APP) {
      return { channel, status: ChannelDeliveryStatus.SENT };
    }

    if (channel === NotificationChannel.SMS) {
      if (preference && !preference.smsEnabled) return { channel, status: ChannelDeliveryStatus.SKIPPED, error: 'opted out' };
      if (!user.phone) return { channel, status: ChannelDeliveryStatus.SKIPPED, error: 'no phone on file' };
      const result = await this.smsProvider.send(user.phone, input.message);
      return {
        channel,
        status: result.success ? ChannelDeliveryStatus.SENT : ChannelDeliveryStatus.FAILED,
        providerRef: result.providerRef,
        error: result.error,
      };
    }

    if (channel === NotificationChannel.EMAIL) {
      if (preference && !preference.emailEnabled) return { channel, status: ChannelDeliveryStatus.SKIPPED, error: 'opted out' };
      if (!user.email) return { channel, status: ChannelDeliveryStatus.SKIPPED, error: 'no email on file' };
      const result = await this.emailProvider.send(user.email, input.title, input.message);
      return {
        channel,
        status: result.success ? ChannelDeliveryStatus.SENT : ChannelDeliveryStatus.FAILED,
        providerRef: result.providerRef,
        error: result.error,
      };
    }

    // PUSH
    if (preference && !preference.pushEnabled) return { channel, status: ChannelDeliveryStatus.SKIPPED, error: 'opted out' };
    const result = await this.pushProvider.send((user._id as any).toString(), input.title, input.message);
    return {
      channel,
      status: result.success ? ChannelDeliveryStatus.SENT : ChannelDeliveryStatus.FAILED,
      providerRef: result.providerRef,
      error: result.error,
    };
  }

  // For pre-account flows (e.g. OTP to a phone/email that may not have a
  // User record yet) - bypasses user lookup and preferences entirely and
  // just dispatches directly. No Notification/inbox record is created,
  // since there's no account yet to own that inbox entry.
  async sendDirect(channel: 'sms' | 'email', to: string, message: string, subject = 'Verification code') {
    if (channel === 'sms') return this.smsProvider.send(to, message);
    return this.emailProvider.send(to, subject, message);
  }

  // For automated/system alerts with no single recipient (e.g. a future
  // scheduled job for low-stock alerts) - fans out to every active staff
  // user of a given role in a hospital. Not wired to any automatic
  // trigger yet (there's no scheduler/cron module in this codebase), but
  // ready for one to call.
  async broadcastToRole(hospitalId: string, role: Role, type: NotificationType, title: string, message: string) {
    const recipients = await this.userModel.find({ hospitalId, role, isActive: true });
    return Promise.all(recipients.map((r) => this.send({ userId: (r._id as any).toString(), type, title, message })));
  }

  // ---------- Inbox (in-app notification center) ----------

  async findMyNotifications(userId: string, query: SearchNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: any = { userId };
    if (query.unreadOnly) filter.isRead = false;

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({ userId, isRead: false }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit), unreadCount };
  }

  async markRead(userId: string, id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllRead(userId: string) {
    const result = await this.notificationModel.updateMany({ userId, isRead: false }, { isRead: true });
    return { updated: result.modifiedCount };
  }

  // ---------- Preferences ----------

  async getPreferences(userId: string): Promise<NotificationPreferenceDocument> {
    const existing = await this.preferenceModel.findOne({ userId });
    if (existing) return existing;
    // Defaults (all channels on) are implicit until the user changes
    // them - only materialize a document once they actually save a change.
    return new this.preferenceModel({ userId });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreferenceDocument> {
    return this.preferenceModel.findOneAndUpdate(
      { userId },
      { $set: dto },
      { new: true, upsert: true },
    );
  }
}
