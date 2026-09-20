import { z } from 'zod';

const COMMON = new Set([
  'password',
  'password1',
  '12345678',
  'qwertyuiop',
  'letmein123',
  'palmaawards',
  'iloveyou1',
]);

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(200, 'That password is too long.')
  .refine((value) => !COMMON.has(value.toLowerCase()), 'That password is too common.')
  .refine(
    (value) => /[a-z]/.test(value) && /[A-Z0-9]/.test(value),
    'Mix upper and lower case, or include a number.',
  );
