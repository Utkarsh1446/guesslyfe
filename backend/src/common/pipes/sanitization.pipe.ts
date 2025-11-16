/**
 * Sanitization Pipe
 *
 * Sanitizes and validates incoming request data
 */

import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

@Injectable()
export class SanitizationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize strings recursively
    const sanitized = this.sanitizeObject(value);

    // Transform to class instance
    const object = plainToClass(metatype, sanitized);

    // Validate
    const errors = await validate(object, {
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Transform to the correct type
      forbidUnknownValues: true, // Throw error if unknown values are provided
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return object;
  }

  /**
   * Check if type should be validated
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string (remove potential XSS)
   */
  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return str;
    }

    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Format validation errors
   */
  private formatErrors(errors: ValidationError[]): any {
    const formatted: Record<string, string[]> = {};

    errors.forEach(error => {
      const constraints = error.constraints;
      if (constraints) {
        formatted[error.property] = Object.values(constraints);
      }

      // Handle nested errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatNestedErrors(error.children, error.property);
        Object.assign(formatted, nestedErrors);
      }
    });

    return {
      message: 'Validation failed',
      errors: formatted,
    };
  }

  /**
   * Format nested validation errors
   */
  private formatNestedErrors(
    errors: ValidationError[],
    parentPath: string,
  ): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach(error => {
      const path = `${parentPath}.${error.property}`;
      const constraints = error.constraints;

      if (constraints) {
        formatted[path] = Object.values(constraints);
      }

      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatNestedErrors(error.children, path);
        Object.assign(formatted, nestedErrors);
      }
    });

    return formatted;
  }
}
