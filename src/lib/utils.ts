import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidEmailFormat(email: string): boolean {
  const normalizedEmail = email.trim();

  // Prevent plain sentences while allowing common RFC-like email shapes.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
}
