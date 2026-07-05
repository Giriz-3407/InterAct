type MessageHandler = (data: any) => void;

export class WSClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();

  connect(url: string, onOpen?: () => void) {
    if (this.socket) {
      this.disconnect();
    }
    void 0 && console.log(`Connecting to WebSocket at ${url}...`);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      void 0 && console.log("WebSocket connection established");
      if (onOpen) onOpen();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventName = data.event;
        if (eventName) {
          const eventListeners = this.listeners.get(eventName);
          if (eventListeners) {
            eventListeners.forEach((cb) => cb(data));
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    this.socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    this.socket.onclose = () => {
      void 0 && console.log("WebSocket connection closed");
    };
  }

  on(event: string, callback: MessageHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: string, callback: MessageHandler) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  send(event: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, ...payload }));
    } else {
      void 0 && console.warn("WebSocket is not connected/open");
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsClient = new WSClient();
export default wsClient;
