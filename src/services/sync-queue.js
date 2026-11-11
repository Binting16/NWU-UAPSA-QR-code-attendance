import { sheetsApi } from './sheets-api.js';

class SyncQueueService {
  constructor() {
    this.timer = null;
    this.isProcessing = false;
  }

  start(store, intervalMs = 15000) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.processQueue(store), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async processQueue(store) {
    if (this.isProcessing) return;
    const state = store.getState();
    const queue = state.pendingSync || [];
    const sheetsUrl = (state.sheetsUrl || '').trim();

    if (queue.length === 0 || !sheetsUrl) return;

    this.isProcessing = true;
    const remaining = [];

    for (const item of queue) {
      try {
        await sheetsApi.postAction(sheetsUrl, item);
      } catch (err) {
        console.warn('Sync retry failed for item, keeping in queue:', err);
        remaining.push(item);
      }
    }

    this.isProcessing = false;

    if (remaining.length !== queue.length) {
      store.update(s => {
        s.pendingSync = remaining;
      });
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message: `Synced ${queue.length - remaining.length} pending records` }
      }));
    }
  }
}

export const syncQueue = new SyncQueueService();
