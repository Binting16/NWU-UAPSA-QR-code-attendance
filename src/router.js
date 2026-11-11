/**
 * Hash-based router for static GitHub Pages hosting
 */
class Router {
  constructor() {
    this.routes = ['scanner', 'roster', 'events', 'admin', 'settings'];
    this.currentRoute = this.getHashRoute();
    this.listeners = new Set();

    window.addEventListener('hashchange', () => {
      this.currentRoute = this.getHashRoute();
      this.notify();
    });

    // Ensure default hash if empty
    if (!window.location.hash) {
      window.location.hash = '#/scanner';
    }
  }

  getHashRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
    return this.routes.includes(hash) ? hash : 'scanner';
  }

  getRoute() {
    return this.currentRoute;
  }

  navigate(route) {
    if (this.routes.includes(route)) {
      window.location.hash = `#/${route}`;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentRoute);
      } catch (err) {
        console.error('Router listener error:', err);
      }
    }
  }
}

export const router = new Router();
