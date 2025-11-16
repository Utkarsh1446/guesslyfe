/**
 * Wallet Address Validator
 *
 * Custom validator for Ethereum wallet addresses
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsEthereumAddressConstraint implements ValidatorConstraintInterface {
  validate(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Check if it's a valid Ethereum address format (0x followed by 40 hex characters)
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(address)) {
      return false;
    }

    // Optional: Add checksum validation if needed
    // For now, we'll just validate the format

    return true;
  }

  defaultMessage(): string {
    return 'Invalid Ethereum address format. Must be 0x followed by 40 hexadecimal characters.';
  }
}

/**
 * Decorator to validate Ethereum addresses
 */
export function IsEthereumAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEthereumAddressConstraint,
    });
  };
}

/**
 * Validate Ethereum address checksum (EIP-55)
 */
export function validateAddressChecksum(address: string): boolean {
  // This is a placeholder for checksum validation
  // You can implement full EIP-55 checksum validation if needed
  // For now, we'll just ensure the format is correct
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize Ethereum address (lowercase)
 */
export function normalizeEthereumAddress(address: string): string {
  if (!address) return '';
  return address.toLowerCase();
}

/**
 * Check if two Ethereum addresses are the same
 */
export function isSameAddress(address1: string, address2: string): boolean {
  if (!address1 || !address2) return false;
  return normalizeEthereumAddress(address1) === normalizeEthereumAddress(address2);
}
