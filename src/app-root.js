import { LitElement, html, css } from 'lit';
import { router } from './router.js';
import { store } from './state/store.js';
import { syncQueue } from './services/sync-queue.js';

// Import components and views
import './components/ui-topbar.js';
import './components/ui-navigation.js';
import './components/ui-toast.js';
import './components/ui-modal.js';
import './views/view-scanner.js';
import './views/view-roster.js';
import './views/view-events.js';
import './views/view-admin.js';
import './views/view-settings.js';

export class AppRoot extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg, #EEF6F2);
      color: var(--ink, #1A2332);
    }

    main {
      flex: 1 1 auto;
      padding-bottom: calc(var(--action-bar-height, 64px) + 24px);
    }

    @media (min-width: 768px) {
      main {
        padding-bottom: 24px;
      }
    }
  `;

  static properties = {
    currentRoute: { type: String }
  };

  constructor() {
    super();
    this.currentRoute = router.getRoute();
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribeRouter = router.subscribe(r => {
      this.currentRoute = r;
      window.scrollTo(0, 0);
    });

    // Start background sync retry worker
    syncQueue.start(store);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeRouter) this.unsubscribeRouter();
    syncQueue.stop();
  }

  renderView() {
    switch (this.currentRoute) {
      case 'scanner':
        return html`<view-scanner></view-scanner>`;
      case 'roster':
        return html`<view-roster></view-roster>`;
      case 'events':
        return html`<view-events></view-events>`;
      case 'admin':
        return html`<view-admin></view-admin>`;
      case 'settings':
        return html`<view-settings></view-settings>`;
      default:
        return html`<view-scanner></view-scanner>`;
    }
  }

  render() {
    return html`
      <ui-topbar></ui-topbar>
      <ui-navigation></ui-navigation>
      <main role="main">
        ${this.renderView()}
      </main>
      <ui-toast></ui-toast>
    `;
  }
}

customElements.define('app-root', AppRoot);
