import {  clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type {ClassValue} from "clsx";

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function truncateMiddle(value: string, maxLen: number) {
  if (value.length <= maxLen) return value
  const half = Math.floor((maxLen - 3) / 2)
  return `${value.slice(0, half)}...${value.slice(-half)}`
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}
