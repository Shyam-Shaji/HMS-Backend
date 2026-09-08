import { Controller, Body, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SearchNotificationsDto } from './dto/search-notifications.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationType } from './schemas/notification.schema';
import { Roles } from '../../common/decorators/role.decorator';
import { Role } from '../../common/enums/role.enums';
import { RolesGuard } from '../../common/guards/roles.guards';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    // ---- Inbox - every authenticated role has one ----

    @Get('me')
  findMy(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchNotificationsDto) {
    return this.notificationsService.findMyNotifications(user.userId, query);
  }

  @Patch('me/:id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(user.userId, id);
  }

  @Patch('me/read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.userId);
  }

  // ---- Preferences ----

  @Get('me/preferences')
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.userId);
  }

  @Patch('me/preferences')
  updatePreferences(@Body() dto: UpdatePreferencesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.updatePreferences(user.userId, dto);
  }

  // ---- Staff-triggered custom notification ----

  @Post('send')
  @Roles(Role.HOSPITAL_ADMIN)
  send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send({
      userId: dto.userId,
      type: dto.type ?? NotificationType.CUSTOM,
      title: dto.title,
      message: dto.message,
      channels: dto.channels,
    });
  }
}
