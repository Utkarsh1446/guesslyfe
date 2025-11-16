import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { QUEUE_NAMES, JOB_TYPES, JOB_CONFIG, NotificationJobData } from '../queue.constants';
import { Notification, NotificationType } from '../../database/entities/notification.entity';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Processor(QUEUE_NAMES.NOTIFICATION)
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing notification job ${job.id} of type ${job.name}...`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Notification job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`, error.stack);
  }

  /**
   * Send email notification
   */
  @Process(JOB_TYPES.NOTIFICATION.SEND_EMAIL)
  async sendEmail(job: Job<NotificationJobData>) {
    const { recipient, subject, body, data } = job.data;

    this.logger.log(`Sending email to ${recipient}: ${subject || 'Notification'}`);

    try {
      // Get notification type from data
      const notificationType = data?.type as NotificationType;

      // Generate email template based on type
      const template = this.getEmailTemplate(notificationType, data, subject || '', body || '');

      // Check user preferences (if user address provided)
      if (await this.isEmailAllowed(recipient, notificationType)) {
        // Send email using SendGrid (if configured)
        const sent = await this.sendEmailViaSendGrid(recipient, template);

        if (sent) {
          this.logger.log(`✅ Email sent successfully to ${recipient}`);
        } else {
          this.logger.warn(`Email service not configured, email logged for ${recipient}`);
        }

        // Also create in-app notification for user
        await this.createInAppNotification(recipient, notificationType, template.subject, body || template.text, data);

        return {
          success: true,
          type: 'email',
          recipient,
          subject: template.subject,
          sentAt: new Date(),
        };
      } else {
        this.logger.log(`Email blocked by user preferences for ${recipient}`);
        return {
          success: false,
          type: 'email',
          recipient,
          reason: 'blocked_by_preferences',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Send push notification
   */
  @Process(JOB_TYPES.NOTIFICATION.SEND_PUSH)
  async sendPush(job: Job<NotificationJobData>) {
    const { recipient, subject, body, data } = job.data;

    this.logger.log(`Sending push notification to ${recipient}: ${subject || 'Notification'}`);

    try {
      const notificationType = data?.type as NotificationType;
      const notificationTitle = subject || 'GuessLyfe Notification';
      const notificationBody = body || 'You have a new notification';

      // Check user preferences
      if (await this.isPushAllowed(recipient, notificationType)) {
        // Send push via Firebase Cloud Messaging (if configured)
        const sent = await this.sendPushViaFCM(recipient, notificationTitle, notificationBody, data);

        if (sent) {
          this.logger.log(`✅ Push notification sent to ${recipient}`);
        } else {
          this.logger.warn(`Push service not configured, notification logged for ${recipient}`);
        }

        // Create in-app notification
        await this.createInAppNotification(recipient, notificationType, notificationTitle, notificationBody, data);

        return {
          success: true,
          type: 'push',
          recipient,
          sentAt: new Date(),
        };
      } else {
        this.logger.log(`Push blocked by user preferences for ${recipient}`);
        return {
          success: false,
          type: 'push',
          recipient,
          reason: 'blocked_by_preferences',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  @Process(JOB_TYPES.NOTIFICATION.SEND_WEBHOOK)
  async sendWebhook(job: Job<NotificationJobData>) {
    const { recipient, subject, data } = job.data;

    this.logger.log(`Sending webhook to ${recipient}`);

    try {
      // Send HTTP POST request to webhook URL
      const response = await fetch(recipient, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GuessLyfe-Webhook/1.0',
        },
        body: JSON.stringify({
          subject,
          ...data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        this.logger.log(`✅ Webhook sent successfully to ${recipient} (${response.status})`);

        return {
          success: true,
          type: 'webhook',
          recipient,
          statusCode: response.status,
          sentAt: new Date(),
        };
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.error(`Webhook failed with status ${response.status}: ${errorText}`);

        throw new Error(`Webhook failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send webhook: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  /**
   * Get email template based on notification type
   */
  private getEmailTemplate(
    type: NotificationType,
    data: any,
    subject: string,
    body: string,
  ): EmailTemplate {
    // Base template
    const baseHtml = (content: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>GuessLyfe</h1>
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <p>You received this email because you have an account with GuessLyfe.</p>
              <p><a href="https://guesslyfe.com/settings/notifications">Manage notification preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Type-specific templates
    switch (type) {
      case NotificationType.MARKET_RESOLVED:
        return {
          subject: subject || `Market Resolved: ${data?.marketTitle || 'Unknown'}`,
          text: body || `The market "${data?.marketTitle}" has been resolved. Outcome: ${data?.outcome}`,
          html: baseHtml(`
            <h2>Market Resolved</h2>
            <p>The market <strong>"${data?.marketTitle}"</strong> has been resolved.</p>
            <p><strong>Outcome:</strong> ${data?.outcome}</p>
            ${data?.won ? `<p>🎉 Congratulations! You won $${data?.amount}!</p>` : ''}
            <p><a href="https://guesslyfe.com/markets/${data?.marketId}" class="button">View Market</a></p>
          `),
        };

      case NotificationType.DIVIDENDS_AVAILABLE:
        return {
          subject: subject || 'New Dividends Available to Claim',
          text: body || `You have $${data?.total} in dividends available to claim.`,
          html: baseHtml(`
            <h2>💰 Dividends Available</h2>
            <p>You have <strong>$${data?.total}</strong> in dividends available to claim!</p>
            <p>Creators: ${data?.creatorIds?.length || 0}</p>
            <p><a href="https://guesslyfe.com/dividends" class="button">Claim Now</a></p>
          `),
        };

      case NotificationType.SHARES_UNLOCKED:
        return {
          subject: subject || 'Creator Shares Unlocked!',
          text: body || `Shares have been unlocked after reaching $${data?.volume} in volume!`,
          html: baseHtml(`
            <h2>🎉 Shares Unlocked!</h2>
            <p>Congratulations! Your creator shares have been unlocked after reaching <strong>$${data?.volume}</strong> in total market volume.</p>
            <p>You can now start earning dividends from trading fees!</p>
            <p><a href="https://guesslyfe.com/creators/${data?.creatorId}" class="button">View Creator</a></p>
          `),
        };

      case NotificationType.CREATOR_APPROVED:
        return {
          subject: subject || 'Creator Application Approved!',
          text: body || 'Your creator application has been approved!',
          html: baseHtml(`
            <h2>✅ Creator Approved</h2>
            <p>Congratulations! Your creator application has been approved.</p>
            <p>You can now start creating markets and building your community!</p>
            <p><a href="https://guesslyfe.com/dashboard" class="button">Go to Dashboard</a></p>
          `),
        };

      case NotificationType.MARKET_ENDING_SOON:
        return {
          subject: subject || `Market Ending Soon: ${data?.marketTitle}`,
          text: body || `The market "${data?.marketTitle}" will close in ${data?.minutesRemaining} minutes.`,
          html: baseHtml(`
            <h2>⏰ Market Ending Soon</h2>
            <p>The market <strong>"${data?.marketTitle}"</strong> will close in approximately <strong>${data?.minutesRemaining} minutes</strong>.</p>
            <p>Make your final trades now!</p>
            <p><a href="https://guesslyfe.com/markets/${data?.marketId}" class="button">Trade Now</a></p>
          `),
        };

      case NotificationType.SUSPICIOUS_ACTIVITY:
        return {
          subject: subject || '🚨 Suspicious Activity Detected',
          text: body || `Suspicious activity detected in market: ${data?.marketTitle}`,
          html: baseHtml(`
            <h2>🚨 Security Alert</h2>
            <p>Suspicious activity has been detected in the market <strong>"${data?.marketTitle}"</strong>.</p>
            <p><strong>Type:</strong> ${data?.type}</p>
            <p>Our team is investigating. You may want to review this market.</p>
            <p><a href="https://guesslyfe.com/markets/${data?.marketId}" class="button">View Market</a></p>
          `),
        };

      default:
        return {
          subject: subject || 'Notification from GuessLyfe',
          text: body || 'You have a new notification.',
          html: baseHtml(`
            <h2>${subject}</h2>
            <p>${body}</p>
          `),
        };
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendEmailViaSendGrid(
    to: string,
    template: EmailTemplate,
  ): Promise<boolean> {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;

    if (!sendGridApiKey) {
      this.logger.warn('SendGrid API key not configured, skipping email send');
      return false;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sendGridApiKey}`,
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to }],
              subject: template.subject,
            },
          ],
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'no-reply@guesslyfe.com',
            name: 'GuessLyfe',
          },
          content: [
            {
              type: 'text/plain',
              value: template.text,
            },
            {
              type: 'text/html',
              value: template.html,
            },
          ],
        }),
      });

      if (response.ok || response.status === 202) {
        this.logger.log(`Email sent via SendGrid to ${to}`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.error(`SendGrid error: ${response.status} ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`SendGrid request failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   */
  private async sendPushViaFCM(
    deviceToken: string,
    title: string,
    body: string,
    data: any,
  ): Promise<boolean> {
    const fcmServerKey = process.env.FCM_SERVER_KEY;

    if (!fcmServerKey) {
      this.logger.warn('FCM server key not configured, skipping push notification');
      return false;
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          to: deviceToken,
          notification: {
            title,
            body,
            icon: 'app_icon',
            sound: 'default',
          },
          data: data || {},
        }),
      });

      if (response.ok) {
        this.logger.log(`Push notification sent via FCM to ${deviceToken}`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.error(`FCM error: ${response.status} ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`FCM request failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(
    userAddress: string,
    type: NotificationType,
    title: string,
    message: string,
    data: any,
  ): Promise<void> {
    try {
      const notification = this.notificationRepository.create({
        userAddress,
        type,
        title,
        message,
        data,
        read: false,
        actionUrl: this.getActionUrl(type, data),
      });

      await this.notificationRepository.save(notification);

      this.logger.log(`In-app notification created for ${userAddress}`);

      // TODO: Send real-time notification via WebSocket to connected users
      // Example: this.webSocketGateway.sendToUser(userAddress, notification);
    } catch (error) {
      this.logger.error(`Failed to create in-app notification: ${error.message}`);
    }
  }

  /**
   * Get action URL based on notification type
   */
  private getActionUrl(type: NotificationType, data: any): string | null {
    switch (type) {
      case NotificationType.MARKET_RESOLVED:
      case NotificationType.MARKET_ENDING_SOON:
        return data?.marketId ? `/markets/${data.marketId}` : null;
      case NotificationType.DIVIDENDS_AVAILABLE:
        return '/dividends';
      case NotificationType.SHARES_UNLOCKED:
      case NotificationType.CREATOR_APPROVED:
        return data?.creatorId ? `/creators/${data.creatorId}` : '/dashboard';
      case NotificationType.NEW_FOLLOWER:
        return data?.followerId ? `/users/${data.followerId}` : null;
      default:
        return null;
    }
  }

  /**
   * Check if email is allowed for user
   */
  private async isEmailAllowed(
    userAddress: string,
    type: NotificationType,
  ): Promise<boolean> {
    // TODO: Check user notification preferences from database
    // For now, allow all emails except during quiet hours

    const now = new Date();
    const hour = now.getUTCHours();

    // Quiet hours: 22:00 - 08:00 UTC (skip non-critical notifications)
    const isQuietHours = hour >= 22 || hour < 8;
    const criticalTypes = [
      NotificationType.MARKET_RESOLVED,
      NotificationType.DIVIDENDS_AVAILABLE,
      NotificationType.SHARES_UNLOCKED,
      NotificationType.CREATOR_APPROVED,
    ];

    if (isQuietHours && !criticalTypes.includes(type)) {
      this.logger.log(`Skipping non-critical email during quiet hours for ${userAddress}`);
      return false;
    }

    return true;
  }

  /**
   * Check if push notification is allowed for user
   */
  private async isPushAllowed(
    userAddress: string,
    type: NotificationType,
  ): Promise<boolean> {
    // TODO: Check user notification preferences from database
    // For now, allow all push notifications
    return true;
  }

  /**
   * Handle dead letter queue
   */
  private async handleDeadLetter(job: Job, error: Error): Promise<void> {
    this.logger.error(`Job ${job.id} exceeded max retries. Moving to dead letter queue.`, {
      jobId: job.id,
      type: job.name,
      data: job.data,
      error: error.message,
      attempts: job.attemptsMade,
    });

    // TODO: Store failed notifications in database for manual review/retry
    // Example: Save to failed_notifications table with job data and error details
  }
}
