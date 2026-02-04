import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Native Screenshot Blocker Plugin for Capacitor
 * Uses FLAG_SECURE on Android to prevent screenshots/screen recording
 * On iOS, can only detect and react (no native blocking available)
 */

export interface ScreenshotBlockerPlugin {
  /**
   * Enable screenshot blocking (Android: FLAG_SECURE, iOS: detection only)
   */
  enable(): Promise<void>;
  
  /**
   * Disable screenshot blocking
   */
  disable(): Promise<void>;
  
  /**
   * Check if screenshot blocking is supported on this platform
   */
  isSupported(): Promise<{ supported: boolean; canBlock: boolean }>;
  
  /**
   * Add listener for screenshot attempts (iOS mainly)
   */
  addListener(
    eventName: 'screenshotTaken',
    listenerFunc: () => void
  ): Promise<{ remove: () => void }>;
}

// Register the plugin (will be no-op in web)
const ScreenshotBlocker = registerPlugin<ScreenshotBlockerPlugin>('ScreenshotBlocker', {
  web: () => import('./ScreenshotBlockerWeb').then(m => new m.ScreenshotBlockerWeb()),
});

/**
 * Helper function to enable screenshot protection
 * Call this when viewing sensitive content
 */
export const enableScreenshotProtection = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await ScreenshotBlocker.enable();
      console.log('[ScreenshotBlocker] Protection enabled');
      return true;
    } catch (error) {
      console.warn('[ScreenshotBlocker] Failed to enable:', error);
      return false;
    }
  }
  return false;
};

/**
 * Helper function to disable screenshot protection
 * Call this when leaving sensitive content
 */
export const disableScreenshotProtection = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await ScreenshotBlocker.disable();
      console.log('[ScreenshotBlocker] Protection disabled');
      return true;
    } catch (error) {
      console.warn('[ScreenshotBlocker] Failed to disable:', error);
      return false;
    }
  }
  return false;
};

/**
 * Check if we're running on a platform that supports screenshot blocking
 */
export const checkScreenshotBlockingSupport = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await ScreenshotBlocker.isSupported();
      return result;
    } catch {
      return { supported: false, canBlock: false };
    }
  }
  // Web: detection only, no blocking
  return { supported: true, canBlock: false };
};

export default ScreenshotBlocker;
