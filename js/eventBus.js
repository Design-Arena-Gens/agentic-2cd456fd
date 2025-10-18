export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  publish(event, payload) {
    const subscribers = this.listeners.get(event);
    if (!subscribers) return;
    for (const callback of subscribers) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`EventBus error on ${event}`, error);
      }
    }
  }
}
