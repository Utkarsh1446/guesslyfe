import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { LoggerService } from '../../../common/logging/logger.service';

/**
 * Admin Guard
 *
 * Verifies that the request is from an authorized admin by:
 * 1. Checking wallet signature
 * 2. Verifying admin wallet address
 * 3. Validating timestamp to prevent replay attacks
 *
 * Required headers:
 * - x-admin-address: Admin wallet address
 * - x-admin-signature: Signed message
 * - x-admin-timestamp: Message timestamp (within 5 minutes)
 *
 * The signed message format:
 * "GuessLyfe Admin Action: {action} at {timestamp}"
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new LoggerService(AdminGuard.name);
  private readonly adminAddresses: string[];
  private readonly signatureValidityMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    // Get admin addresses from environment (comma-separated)
    const adminAddressesStr = this.configService.get<string>('ADMIN_ADDRESSES', '');
    this.adminAddresses = adminAddressesStr
      .split(',')
      .map((addr) => addr.trim().toLowerCase())
      .filter((addr) => addr.length > 0);

    if (this.adminAddresses.length === 0) {
      this.logger.logWarn('No admin addresses configured! All admin requests will be rejected.');
    } else {
      this.logger.logInfo(`Configured ${this.adminAddresses.length} admin address(es)`);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract admin authentication headers
    const adminAddress = request.headers['x-admin-address'] as string;
    const adminSignature = request.headers['x-admin-signature'] as string;
    const adminTimestamp = request.headers['x-admin-timestamp'] as string;

    // Check if all required headers are present
    if (!adminAddress || !adminSignature || !adminTimestamp) {
      this.logger.logWarn('Admin authentication failed: Missing required headers', {
        hasAddress: !!adminAddress,
        hasSignature: !!adminSignature,
        hasTimestamp: !!adminTimestamp,
        ip: request.ip,
      });
      throw new UnauthorizedException(
        'Admin authentication required. Provide x-admin-address, x-admin-signature, and x-admin-timestamp headers.',
      );
    }

    // Normalize admin address
    const normalizedAddress = adminAddress.toLowerCase();

    // Check if address is in admin list
    if (!this.adminAddresses.includes(normalizedAddress)) {
      this.logger.logWarn('Admin authentication failed: Address not authorized', {
        address: normalizedAddress,
        ip: request.ip,
      });
      throw new ForbiddenException('Address is not authorized as admin');
    }

    // Validate timestamp to prevent replay attacks
    const timestamp = parseInt(adminTimestamp, 10);
    if (isNaN(timestamp)) {
      throw new UnauthorizedException('Invalid timestamp format');
    }

    const now = Date.now();
    const age = now - timestamp;

    if (age < 0) {
      throw new UnauthorizedException('Timestamp is in the future');
    }

    if (age > this.signatureValidityMs) {
      throw new UnauthorizedException(
        `Signature expired (age: ${Math.floor(age / 1000)}s, max: ${this.signatureValidityMs / 1000}s)`,
      );
    }

    // Verify signature
    try {
      const action = `${request.method} ${request.path}`;
      const message = `GuessLyfe Admin Action: ${action} at ${timestamp}`;

      // Recover signer address from signature
      const recoveredAddress = ethers.verifyMessage(message, adminSignature);

      // Check if recovered address matches provided address
      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        this.logger.logWarn('Admin authentication failed: Signature verification failed', {
          providedAddress: normalizedAddress,
          recoveredAddress: recoveredAddress.toLowerCase(),
          ip: request.ip,
        });
        throw new UnauthorizedException('Signature verification failed');
      }

      // Authentication successful - attach admin info to request
      request.admin = {
        address: normalizedAddress,
        timestamp,
        action,
      };

      this.logger.logInfo('Admin authenticated successfully', {
        address: normalizedAddress,
        action,
        ip: request.ip,
      });

      return true;
    } catch (error) {
      this.logger.logError('Admin authentication error', error, {
        address: normalizedAddress,
        ip: request.ip,
      });

      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid signature');
    }
  }
}
