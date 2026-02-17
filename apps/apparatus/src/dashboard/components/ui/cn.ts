import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Handles class conflicts and conditional classes properly
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
