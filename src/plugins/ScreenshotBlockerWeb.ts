import type { ScreenshotBlockerPlugin } from './ScreenshotBlocker';

/**
 * Web implementation of ScreenshotBlocker
 * Only provides detection, no actual blocking possible in web browsers
 */
export class ScreenshotBlockerWeb implements ScreenshotBlockerPlugin {
  private enabled = false;
  private screenshotListeners: Array<() => void> = [];
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  async enable(): Promise<void> {
    if (this.enabled) return;
    this.enabled = true;

    // Set up detection listeners
    this.keydownHandler = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) ||
        (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's')
      ) {
        e.preventDefault();
        this.notifyListeners();
      }
    };

    this.visibilityHandler = () => {
      if (document.hidden) {
        // Potential screenshot on mobile
        this.notifyListeners();
      }
    };

    window.addEventListener('keydown', this.keydownHandler, true);
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Apply CSS-based protections
    this.applyWebProtections();
  }

  async disable(): Promise<void> {
    if (!this.enabled) return;
    this.enabled = false;

    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    this.removeWebProtections();
  }

  async isSupported(): Promise<{ supported: boolean; canBlock: boolean }> {
    // Web can detect but not block
    return { supported: true, canBlock: false };
  }

  async addListener(
    eventName: 'screenshotTaken',
    listenerFunc: () => void
  ): Promise<{ remove: () => void }> {
    if (eventName === 'screenshotTaken') {
      this.screenshotListeners.push(listenerFunc);
    }

    return {
      remove: () => {
        const index = this.screenshotListeners.indexOf(listenerFunc);
        if (index > -1) {
          this.screenshotListeners.splice(index, 1);
        }
      },
    };
  }

  private notifyListeners() {
    this.screenshotListeners.forEach(listener => listener());
  }

  private applyWebProtections() {
    // Add a style tag for CSS-based protections
    const styleId = 'screenshot-blocker-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        [data-protected="true"], 
        [data-protected="true"] * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          pointer-events: auto;
        }
        
        [data-protected="true"] img,
        [data-protected="true"] video {
          pointer-events: none !important;
          -webkit-user-drag: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private removeWebProtections() {
    const style = document.getElementById('screenshot-blocker-styles');
    if (style) {
      style.remove();
    }
  }
}
