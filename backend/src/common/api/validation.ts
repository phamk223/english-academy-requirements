import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { FieldError } from './contract';

export class ApiValidationException extends BadRequestException {
  constructor(readonly fields: FieldError[]) { super('Validation failed'); }
}

const messages: Record<string, string> = {
  whitelistValidation: 'Field is not allowed',
  isDefined: 'Field is required',
  isNotEmpty: 'Field must not be empty',
  isString: 'Field must be a string',
  isEmail: 'Field must be a valid email address',
  isInt: 'Field must be an integer',
  isNumber: 'Field must be a number',
  isBoolean: 'Field must be a boolean',
  isArray: 'Field must be an array',
  isEnum: 'Field has an invalid value',
  min: 'Field is below the minimum value',
  max: 'Field exceeds the maximum value',
  minLength: 'Field is too short',
  maxLength: 'Field is too long',
  nestedValidation: 'Field must contain a valid nested object',
};

export function fieldErrors(errors: ValidationError[], prefix = ''): FieldError[] {
  return errors.flatMap(error => {
    const field = prefix ? `${prefix}.${error.property}` : error.property || '$';
    const own = Object.keys(error.constraints ?? {}).sort().map(code => ({
      field, code, message: messages[code] ?? 'Field is invalid',
    }));
    // Constraint messages/values are never copied: custom validators may embed secrets.
    return [...own, ...fieldErrors(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
    exceptionFactory: errors => new ApiValidationException(fieldErrors(errors)),
  });
}
