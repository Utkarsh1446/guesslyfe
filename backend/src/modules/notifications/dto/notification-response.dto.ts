import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  MARKET_RESOLVED = 'MARKET_RESOLVED',
  MARKET_ENDING_SOON = 'MARKET_ENDING_SOON',
  VOLUME_MILESTONE = 'VOLUME_MILESTONE',
  SHARE_UNLOCKED = 'SHARE_UNLOCKED',
  CREATOR_APPROVED = 'CREATOR_APPROVED',
  TRADE_SETTLED = 'TRADE_SETTLED',
}

export class NotificationDto {
  @ApiProperty({ description: 'Notification ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  type: string;

  @ApiProperty({ description: 'Notification title', example: 'Market Resolved' })
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your market position won!',
  })
  message: string;

  @ApiProperty({
    description: 'Additional data',
    nullable: true,
  })
  data: any;

  @ApiProperty({ description: 'Read status', example: false })
  read: boolean;

  @ApiProperty({ description: 'Created at', example: '2025-01-01T12:00:00Z' })
  createdAt: string;
}

export class NotificationListResponseDto {
  @ApiProperty({ description: 'Notifications', type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty({ description: 'Unread count', example: 5 })
  unreadCount: number;

  @ApiProperty({
    description: 'Pagination',
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export class MarkReadResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;
}

export class MarkAllReadResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Number of notifications marked as read', example: 10 })
  markedCount: number;
}
