import { LitElement, html, css } from 'lit';
import { store } from '../state/store.js';
import { authService } from '../services/auth-service.js';
import { router } from '../router.js';

export class UiTopbar extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--surface, #FFFFFF);
      border-bottom: 1px solid var(--border, #D5E5DC);
      position: sticky;
      top: 0;
      z-index: 80;
    }

    .topbar {
      max-width: 1400px;
      margin: 0 auto;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .brand-mark {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--primary, #0B6E4F);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 0 var(--primary-dark, #063D2B);
    }
    .brand-mark svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2;
    }

    .brand-titles {
      display: flex;
      flex-direction: column;
    }
    .brand-titles h1 {
      margin: 0;
      font-family: var(--font-display, sans-serif);
      font-size: 16px;
      font-weight: 700;
      color: var(--ink, #1A2332);
      line-height: 1.15;
    }
    .brand-titles .sub {
      margin: 2px 0 0;
      font-size: 11px;
      color: var(--muted, #5B6B82);
    }

    .right-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .event-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-pill, 9999px);
      background: var(--primary-tint, #DFF3EA);
      color: var(--primary, #0B6E4F);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .event-badge:hover {
      border-color: var(--primary, #0B6E4F);
    }
    @media (max-width: 640px) {
      .event-badge {
        max-width: 140px;
        font-size: 11px;
        padding: 4px 8px;
      }
      .brand-titles .sub {
        display: none;
      }
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 9px;
      border-radius: var(--radius-pill, 9999px);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .role-admin {
      background: var(--accent-tint, #FFF8EA);
      color: var(--accent-dark, #C5841F);
      border: 1px solid #F3DFB7;
    }
    .role-scanner {
      background: #EDF2F7;
      color: var(--muted, #5B6B82);
      border: 1px solid #CBD5E0;
    }

    .sync-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: var(--radius-pill, 9999px);
    }
    .sync-synced {
      background: var(--success-bg, #E1F7EC);
      color: var(--success-ink, #0E7A4C);
    }
    .sync-pending {
      background: var(--warn-bg, #FCF1DA);
      color: var(--warn, #B8841A);
    }
    .sync-local {
      background: #F1F4F8;
      color: var(--muted, #5B6B82);
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--border, #D5E5DC);
      background: var(--surface, #FFFFFF);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--ink, #1A2332);
      transition: all 0.15s ease;
    }
    .icon-btn:hover {
      background: var(--surface-alt, #FBFCFE);
      border-color: var(--primary, #0B6E4F);
    }
  `;

  static properties = {
    appName: { type: String },
    eventName: { type: String },
    role: { type: String },
    syncState: { type: String },
    pendingCount: { type: Number }
  };

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    const state = store.getState();
    const appName = state.settings.appName || 'QR Code Attendance';
    const currentSession = state.currentSession;
    const eventDisplay = currentSession ? `${currentSession.eventName} · ${currentSession.label}` : 'Pick an Event ▾';
    const isAdmin = authService.isAdmin();
    const role = isAdmin ? 'Admin' : 'Scanner';
    const pendingCount = (state.pendingSync || []).length;
    const isSheetsConnected = !!(state.sheetsUrl || '').trim();

    return html`
      <header class="topbar">
        <div class="brand-section" @click="${() => router.navigate('scanner')}">
          <div class="brand-mark">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 21h3M21 14v3" stroke-linecap="round" />
            </svg>
          </div>
          <div class="brand-titles">
            <h1>${appName}</h1>
            <span class="sub">NWU UAPSA Chapter</span>
          </div>
        </div>

        <div class="right-section">
          <!-- Active Event Pill -->
          <div class="event-badge" title="Tap to switch event" @click="${() => router.navigate('events')}">
            <span>📅</span>
            <span>${eventDisplay}</span>
          </div>

          <!-- Sync Indicator -->
          ${isSheetsConnected ? html`
            <div class="sync-status ${pendingCount > 0 ? 'sync-pending' : 'sync-synced'}" title="${pendingCount > 0 ? `${pendingCount} offline writes pending sync` : 'Synced live with Google Sheet'}">
              <span class="dot"></span>
              <span>${pendingCount > 0 ? `Syncing (${pendingCount})` : 'Live'}</span>
            </div>
          ` : html`
            <div class="sync-status sync-local" title="Operating in offline local-only mode">
              <span class="dot"></span>
              <span>Local</span>
            </div>
          `}

          <!-- Role Chip -->
          <div class="role-badge ${isAdmin ? 'role-admin' : 'role-scanner'}">
            ${isAdmin ? '👑 Secretary' : '📷 Scanner'}
          </div>

          <!-- Settings Cog -->
          <button class="icon-btn" title="Settings" @click="${() => router.navigate('settings')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 13.5a7.97 7.97 0 000-3l1.9-1.5-2-3.4-2.2.9a8 8 0 00-2.6-1.5L14 2h-4l-.5 2.4a8 8 0 00-2.6 1.5l-2.2-.9-2 3.4L4.6 10a7.97 7.97 0 000 3l-1.9 1.5 2 3.4 2.2-.9a8 8 0 002.6 1.5L10 22h4l.5-2.4a8 8 0 002.6-1.5l2.2.9 2-3.4-1.9-1.5z" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </header>
    `;
  }
}

customElements.define('ui-topbar', UiTopbar);
