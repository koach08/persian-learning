/**
 * API Base URL configuration for Capacitor (mobile) vs Web
 * - Web (Vercel): uses relative paths ("/api/...")
 * - Mobile (Capacitor): calls the deployed Vercel API server
 */

const PRODUCTION_API_URL = "https://persian-learning.vercel.app";

function isCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as Record<string, unknown>).Capacitor;
}

export function getApiBase(): string {
  return isCapacitor() ? PRODUCTION_API_URL : "";
}

export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}
