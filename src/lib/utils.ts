import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SOSMED = ['facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'telegram', 'threads', 'linkedin', 'socmed', 'x.com']

export function getJenisSumber(sumber: string): 'Media Sosial' | 'Media Online' {
  const lower = sumber.toLowerCase().trim()
  return SOSMED.some((p) => lower === p || lower.startsWith(p + '.') || lower.startsWith(p + ' ')) ? 'Media Sosial' : 'Media Online'
}
