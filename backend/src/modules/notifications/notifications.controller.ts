import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  NotificationListResponseDto,
  MarkReadResponseDto,
  MarkAllReadResponseDto,
} from './dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications - Get user notifications
   */
  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Returns paginated list of notifications',
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved',
    type: NotificationListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<NotificationListResponseDto> {
    return this.notificationsService.getNotifications(
      req.session.userId,
      unreadOnly || false,
      page || 1,
      limit || 20,
    );
  }

  /**
   * PATCH /notifications/:id/read - Mark notification as read
   */
  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a single notification as read',
  })
  @ApiParam({ name: 'id', description: 'Notification ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: MarkReadResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Req() req: any,
    @Param('id') notificationId: string,
  ): Promise<MarkReadResponseDto> {
    return this.notificationsService.markAsRead(notificationId, req.session.userId);
  }

  /**
   * POST /notifications/read-all - Mark all notifications as read
   */
  @Post('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks all user notifications as read',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    type: MarkAllReadResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@Req() req: any): Promise<MarkAllReadResponseDto> {
    return this.notificationsService.markAllAsRead(req.session.userId);
  }

  /**
   * DELETE /notifications/:id - Delete notification
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Deletes a notification',
  })
  @ApiParam({ name: 'id', description: 'Notification ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted',
    type: MarkReadResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Req() req: any,
    @Param('id') notificationId: string,
  ): Promise<MarkReadResponseDto> {
    return this.notificationsService.deleteNotification(
      notificationId,
      req.session.userId,
    );
  }
}
