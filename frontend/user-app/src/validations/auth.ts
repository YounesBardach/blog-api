import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .regex(/^[a-z0-9]+$/, 'Username can only contain lowercase letters and numbers')
    .transform(val => val.toLowerCase().trim()),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .transform(val => val.trim()),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .transform(val => val.trim()),
  email: z
    .string()
    .email('Please provide a valid email')
    .transform(val => val.toLowerCase().trim()),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .regex(/^[a-z0-9]+$/, 'Username can only contain lowercase letters and numbers')
    .transform(val => val.toLowerCase().trim()),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .transform(val => val.trim()),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>; 