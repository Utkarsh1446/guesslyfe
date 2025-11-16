/**
 * Twitter Handle Validator
 *
 * Custom validator for Twitter handles
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsTwitterHandleConstraint implements ValidatorConstraintInterface {
  validate(handle: string): boolean {
    if (!handle || typeof handle !== 'string') {
      return false;
    }

    // Remove @ if present
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    // Twitter handle rules:
    // - 1-15 characters
    // - Only alphanumeric and underscore
    // - Cannot be all numbers
    const twitterHandleRegex = /^[A-Za-z0-9_]{1,15}$/;

    if (!twitterHandleRegex.test(cleanHandle)) {
      return false;
    }

    // Cannot be all numbers
    if (/^\d+$/.test(cleanHandle)) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Invalid Twitter handle. Must be 1-15 characters, alphanumeric and underscore only, and cannot be all numbers.';
  }
}

/**
 * Decorator to validate Twitter handles
 */
export function IsTwitterHandle(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTwitterHandleConstraint,
    });
  };
}

/**
 * Normalize Twitter handle (remove @ and lowercase)
 */
export function normalizeTwitterHandle(handle: string): string {
  if (!handle) return '';
  const cleaned = handle.startsWith('@') ? handle.slice(1) : handle;
  return cleaned.toLowerCase();
}

/**
 * Format Twitter handle with @ prefix
 */
export function formatTwitterHandle(handle: string): string {
  if (!handle) return '';
  const normalized = normalizeTwitterHandle(handle);
  return `@${normalized}`;
}

/**
 * Validate Twitter handle length
 */
export function isValidTwitterHandleLength(handle: string): boolean {
  const cleaned = normalizeTwitterHandle(handle);
  return cleaned.length >= 1 && cleaned.length <= 15;
}
