import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_NAMES, JOB_TYPES, JOB_CONFIG, NotificationJobData } from '../queue.constants';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }

  /**
   * Send email notification
   */
  @Process(JOB_TYPES.NOTIFICATION.SEND_EMAIL)
  async sendEmail(job: Job<NotificationJobData>) {
    const { recipient, subject, body, data } = job.data;

    this.logger.log(`Sending email to ${recipient}`);

    try {
      // TODO: Implement email sending using a service like SendGrid, AWS SES, etc.
      // For now, just log the email
      this.logger.log(`Email would be sent to ${recipient}: ${subject}`);

      return {
        success: true,
        type: 'email',
        recipient,
        sentAt: new Date(),
      };
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

    this.logger.log(`Sending push notification to ${recipient}`);

    try {
      // TODO: Implement push notification using a service like Firebase Cloud Messaging
      // For now, just log the notification
      this.logger.log(`Push notification would be sent to ${recipient}: ${subject}`);

      return {
        success: true,
        type: 'push',
        recipient,
        sentAt: new Date(),
      };
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
    const { recipient, data } = job.data;

    this.logger.log(`Sending webhook to ${recipient}`);

    try {
      // TODO: Implement webhook POST request
      // Use axios or fetch to send POST request to webhook URL
      this.logger.log(`Webhook would be sent to ${recipient} with data: ${JSON.stringify(data)}`);

      return {
        success: true,
        type: 'webhook',
        recipient,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send webhook: ${error.message}`, error.stack);

      if (job.attemptsMade >= JOB_CONFIG.ATTEMPTS) {
        await this.handleDeadLetter(job, error);
      }

      throw error;
    }
  }

  private async handleDeadLetter(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} exceeded max retries.`, {
      jobId: job.id,
      data: job.data,
      error: error.message,
    });

    // TODO: Store failed notifications in database for manual review/retry
  }
}
