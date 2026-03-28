/**
 * Class name merging utility for shadcn/ui components.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 *
 * Depends on: clsx, tailwind-merge
 * Used by: All UI components
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
