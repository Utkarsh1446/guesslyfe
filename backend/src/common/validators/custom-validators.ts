/**
 * Custom Validators
 *
 * Additional custom validators for common use cases
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validate BigInt string (for wei values)
 */
@ValidatorConstraint({ async: false })
export class IsBigIntStringConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    // Check if it's a valid positive integer string
    return /^\d+$/.test(value);
  }

  defaultMessage(): string {
    return 'Value must be a valid positive integer string (for BigInt values)';
  }
}

export function IsBigIntString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBigIntStringConstraint,
    });
  };
}

/**
 * Validate percentage (0-100)
 */
@ValidatorConstraint({ async: false })
export class IsPercentageConstraint implements ValidatorConstraintInterface {
  validate(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 100;
  }

  defaultMessage(): string {
    return 'Value must be a percentage between 0 and 100';
  }
}

export function IsPercentage(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPercentageConstraint,
    });
  };
}

/**
 * Validate future date
 */
@ValidatorConstraint({ async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return dateObj > now;
  }

  defaultMessage(): string {
    return 'Date must be in the future';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

/**
 * Validate date range
 */
@ValidatorConstraint({ async: false })
export class IsAfterConstraint implements ValidatorConstraintInterface {
  validate(value: Date | string, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    if (!value || !relatedValue) {
      return false;
    }

    const dateValue = typeof value === 'string' ? new Date(value) : value;
    const dateRelated = typeof relatedValue === 'string' ? new Date(relatedValue) : relatedValue;

    return dateValue > dateRelated;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must be after ${relatedPropertyName}`;
  }
}

export function IsAfter(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsAfterConstraint,
    });
  };
}

/**
 * Validate URL with specific protocols
 */
@ValidatorConstraint({ async: false })
export class IsSecureUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const urlObj = new URL(url);
      // Only allow https and ipfs protocols
      return ['https:', 'ipfs:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'URL must use HTTPS or IPFS protocol';
  }
}

export function IsSecureUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSecureUrlConstraint,
    });
  };
}

/**
 * Validate market outcome (YES/NO)
 */
@ValidatorConstraint({ async: false })
export class IsMarketOutcomeConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return ['YES', 'NO'].includes(value?.toUpperCase());
  }

  defaultMessage(): string {
    return 'Outcome must be either YES or NO';
  }
}

export function IsMarketOutcome(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMarketOutcomeConstraint,
    });
  };
}

/**
 * Sanitize string (remove HTML tags and dangerous characters)
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove dangerous characters
    .trim();
}

/**
 * Validate non-empty string after trimming
 */
@ValidatorConstraint({ async: false })
export class IsNonEmptyStringConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  defaultMessage(): string {
    return 'Value must be a non-empty string';
  }
}

export function IsNonEmptyString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNonEmptyStringConstraint,
    });
  };
}
