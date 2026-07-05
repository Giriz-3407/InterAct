/**
 * Document Picture-in-Picture Service
 * 
 * Manages a custom Document PiP window for active collaboration sessions.
 * This implementation does NOT use Chrome's Automatic Picture-in-Picture,
 * as testing has shown it is unreliable for screen-sharing streams.
 * 
 * Instead, we manage the PiP lifecycle entirely within the application using
 * the Document Picture-in-Picture API when available.
 */

// Extend DocumentPictureInPicture type
interface DocumentPictureInPictureWindow extends Window {
  // Standard Window properties
}

interface DocumentPictureInPictureAPI {
  requestWindow(options?: { width?: number; height?: number }): Promise<DocumentPictureInPictureWindow>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureAPI;
  }
}

interface PipConfig {
  /** The video stream to display in PiP */
  videoElement: HTMLVideoElement;
  /** Callback when user clicks "Return to InterAct" */
  onReturnToApp: () => void;
  /** Callback when PiP window is closed */
  onClose?: () => void;
}

class DocumentPipService {
  private pipWindow: DocumentPictureInPictureWindow | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: PipConfig | null = null;
  private cleanupFns: Array<() => void> = [];
  
  /**
   * Check if Document Picture-in-Picture is supported
   */
  isSupported(): boolean {
    return 'documentPictureInPicture' in window;
  }

  /**
   * Check if PiP window is currently open
   */
  isActive(): boolean {
    return this.pipWindow !== null && !this.pipWindow.closed;
  }

  /**
   * Open a Document PiP window with the shared screen/video
   */
  async open(config: PipConfig): Promise<boolean> {
    // Fail gracefully if unsupported
    if (!this.isSupported()) {
      console.warn('[DocPiP] Document Picture-in-Picture is not supported in this browser');
      return false;
    }

    // Don't create multiple windows
    if (this.isActive()) {
      console.log('[DocPiP] PiP window already open');
      return true;
    }

    // Ensure we have a valid video element with stream
    if (!config.videoElement || !config.videoElement.srcObject) {
      console.warn('[DocPiP] Cannot open PiP: no video element or stream');
      return false;
    }

    try {
      this.config = config;
      
      // Request Document PiP window
      console.log('[DocPiP] Opening Document Picture-in-Picture window');
      this.pipWindow = await window.documentPictureInPicture!.requestWindow({
        width: 640,
        height: 360,
      });

      // Clone the video element into PiP window
      this.setupPipWindow();
      
      // Setup cleanup handlers
      this.setupCleanupHandlers();

      console.log('[DocPiP] Document PiP window opened successfully');
      return true;
    } catch (error) {
      console.error('[DocPiP] Failed to open Document PiP window:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Close the PiP window
   */
  close(): void {
    if (!this.isActive()) {
      return;
    }

    console.log('[DocPiP] Closing Document PiP window');
    
    try {
      this.pipWindow?.close();
    } catch (error) {
      console.error('[DocPiP] Error closing PiP window:', error);
    }
    
    this.cleanup();
  }

  /**
   * Setup the PiP window content and styles
   */
  private setupPipWindow(): void {
    if (!this.pipWindow || !this.config) return;

    const pipDoc = this.pipWindow.document;

    // Add styles to PiP window
    const style = pipDoc.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        width: 100vw;
        height: 100vh;
        background: #000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .pip-video-container {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
        position: relative;
      }
      
      .pip-video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      
      .pip-controls {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.95);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .pip-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      
      .pip-btn:active {
        transform: scale(0.98);
      }
      
      .pip-btn-primary {
        background: #6366f1;
        color: white;
      }
      
      .pip-btn-primary:hover {
        background: #5558e3;
      }
      
      .pip-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #e4e4e7;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .pip-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .pip-watermark {
        position: absolute;
        top: 12px;
        left: 12px;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        padding: 6px 12px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: #c0c1ff;
        border: 1px solid rgba(192, 193, 255, 0.2);
      }
      
      .pip-live-indicator {
        width: 6px;
        height: 6px;
        background: #ef4444;
        border-radius: 50%;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `;
    pipDoc.head.appendChild(style);

    // Create container
    const container = pipDoc.createElement('div');
    container.className = 'pip-video-container';

    // Create watermark
    const watermark = pipDoc.createElement('div');
    watermark.className = 'pip-watermark';
    watermark.innerHTML = `
      <div class="pip-live-indicator"></div>
      <span>InterAct Live</span>
    `;
    container.appendChild(watermark);

    // Clone and setup video element
    this.videoElement = pipDoc.createElement('video');
    this.videoElement.className = 'pip-video';
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true; // Video always muted (audio plays from original tab)
    this.videoElement.controls = false;
    
    // Transfer the stream to PiP video
    if (this.config.videoElement.srcObject) {
      this.videoElement.srcObject = this.config.videoElement.srcObject;
    }
    
    container.appendChild(this.videoElement);

    // Create controls
    const controls = pipDoc.createElement('div');
    controls.className = 'pip-controls';

    // Return to InterAct button
    const returnBtn = pipDoc.createElement('button');
    returnBtn.className = 'pip-btn pip-btn-primary';
    returnBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Return to InterAct
    `;
    returnBtn.addEventListener('click', () => {
      this.config?.onReturnToApp();
      this.close();
    });
    controls.appendChild(returnBtn);

    // Close PiP button
    const closeBtn = pipDoc.createElement('button');
    closeBtn.className = 'pip-btn pip-btn-secondary';
    closeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Close PiP
    `;
    closeBtn.addEventListener('click', () => {
      this.close();
    });
    controls.appendChild(closeBtn);

    // Append to body
    pipDoc.body.appendChild(container);
    pipDoc.body.appendChild(controls);

    // Start video playback
    this.videoElement.play().catch(err => {
      console.warn('[DocPiP] Video play failed:', err);
    });
  }

  /**
   * Setup cleanup handlers for automatic closure
   */
  private setupCleanupHandlers(): void {
    if (!this.pipWindow) return;

    // Handle PiP window close event
    const handlePipClose = () => {
      console.log('[DocPiP] PiP window was closed');
      this.cleanup();
      this.config?.onClose?.();
    };

    this.pipWindow.addEventListener('pagehide', handlePipClose);
    this.pipWindow.addEventListener('unload', handlePipClose);

    // Track cleanup functions
    this.cleanupFns.push(() => {
      if (this.pipWindow) {
        this.pipWindow.removeEventListener('pagehide', handlePipClose);
        this.pipWindow.removeEventListener('unload', handlePipClose);
      }
    });
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    // Run all cleanup functions
    this.cleanupFns.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('[DocPiP] Cleanup error:', error);
      }
    });
    this.cleanupFns = [];

    // Clear video element
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    // Clear references
    this.pipWindow = null;
    this.config = null;
  }
}

// Export singleton instance
export const documentPipService = new DocumentPipService();
