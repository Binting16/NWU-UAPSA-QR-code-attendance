import { LitElement, html, css } from 'lit';
import { router } from '../router.js';
import { authService } from '../services/auth-service.js';

export class UiNavigation extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    /* Fixed Bottom Navigation for Mobile */
    nav.nav-bar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--surface, #FFFFFF);
      border-top: 1px solid var(--border, #D5E5DC);
      padding: 6px 12px calc(6px + env(safe-area-inset-bottom, 0px));
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 90;
      box-shadow: 0 -4px 16px rgba(15, 25, 40, 0.06);
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 6px 10px;
      border: none;
      background: none;
      color: var(--muted, #5B6B82);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 10px;
      transition: all 0.15s ease;
      min-width: 58px;
    }
    .nav-item svg {
      width: 22px;
      height: 22px;
      stroke-width: 1.8;
      fill: none;
      stroke: currentColor;
    }

    .nav-item.active {
      color: var(--primary, #0B6E4F);
      font-weight: 700;
      background: var(--primary-tint, #DFF3EA);
    }
    .nav-item:active {
      transform: scale(0.93);
    }

    /* Desktop Sub-Nav Header */
    @media (min-width: 768px) {
      nav.nav-bar {
        position: static;
        box-shadow: none;
        border-top: none;
        border-bottom: 1px solid var(--border, #D5E5DC);
        padding: 6px 16px;
        justify-content: center;
        gap: 16px;
        background: var(--surface-alt, #FBFCFE);
      }
      .nav-item {
        flex-direction: row;
        gap: 8px;
        font-size: 13px;
        padding: 8px 16px;
      }
      .nav-item svg {
        width: 18px;
        height: 18px;
      }
    }
  `;

  static properties = {
    currentRoute: { type: String }
  };

  connectedCallback() {
    super.connectedCallback();
    this.currentRoute = router.getRoute();
    this.unsubscribe = router.subscribe(r => {
      this.currentRoute = r;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    const r = this.currentRoute;
    const isAdmin = authService.isAdmin();

    return html`
      <nav class="nav-bar" aria-label="Main Navigation">
        <!-- Scanner -->
        <button class="nav-item ${r === 'scanner' ? 'active' : ''}" @click="${() => router.navigate('scanner')}">
          <svg viewBox="0 0 24 24">
            <path d="M4 7V5a1 1 0 011-1h2M20 7V5a1 1 0 00-1-1h-2M4 17v2a1 1 0 001 1h2M20 17v2a1 1 0 01-1 1h-2" stroke-linecap="round" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
          </svg>
          <span>Scanner</span>
        </button>

        <!-- Roster Log -->
        <button class="nav-item ${r === 'roster' ? 'active' : ''}" @click="${() => router.navigate('roster')}">
          <svg viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke-linecap="round" />
            <path d="M9 12h6M9 16h4" stroke-linecap="round" />
          </svg>
          <span>Roster</span>
        </button>

        <!-- Events -->
        <button class="nav-item ${r === 'events' ? 'active' : ''}" @click="${() => router.navigate('events')}">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" stroke-linecap="round" />
          </svg>
          <span>Events</span>
        </button>

        <!-- Admin / Secretary -->
        <button class="nav-item ${r === 'admin' ? 'active' : ''}" @click="${() => router.navigate('admin')}">
          <svg viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>${isAdmin ? 'Admin' : 'Secretary'}</span>
        </button>

        <!-- Settings -->
        <button class="nav-item ${r === 'settings' ? 'active' : ''}" @click="${() => router.navigate('settings')}">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </nav>
    `;
  }
}

customElements.define('ui-navigation', UiNavigation);
