import { LitElement, html, css } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { store } from '../state/store.js';
import { authService } from '../services/auth-service.js';
import { router } from '../router.js';

export class ViewEvents extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        padding: 16px;
        max-width: 640px;
        margin: 0 auto;
      }

      .session-card {
        border: 2px solid var(--border, #D5E5DC);
        border-radius: var(--radius, 16px);
        padding: 16px;
        background: var(--surface-alt, #FBFCFE);
        margin-bottom: 14px;
        transition: all 0.15s ease;
      }
      .session-card:not(.card-closed) {
        cursor: pointer;
      }
      .session-card:not(.card-closed):hover {
        border-color: var(--primary, #0B6E4F);
        transform: translateY(-1px);
      }
      .session-card.active {
        border-color: var(--primary, #0B6E4F);
        background: var(--primary-tint, #DFF3EA);
        box-shadow: 0 4px 12px rgba(11, 110, 79, 0.12);
      }

      .session-card.card-closed {
        border-color: #E2E8F0;
        background: #F8FAFC;
        opacity: 0.85;
      }

      .sc-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 6px;
      }
      .sc-title {
        font-size: 16px;
        font-weight: 800;
        color: var(--ink, #1A2332);
        margin: 0;
      }
      .sc-meta {
        font-family: var(--font-mono, monospace);
        font-size: 13px;
        color: var(--muted, #5B6B82);
        margin: 0 0 10px;
      }

      .sc-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px dashed var(--border, #D5E5DC);
        flex-wrap: wrap;
      }

      .sc-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .tag {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: var(--radius-pill, 9999px);
        background: #EDF2F7;
        color: var(--muted, #5B6B82);
      }
      .tag.active-tag {
        background: var(--primary, #0B6E4F);
        color: #ffffff;
      }
      .tag.period-tag {
        background: var(--accent-tint, #FFF8EA);
        color: var(--accent-dark, #C5841F);
      }
      .tag.open-tag {
        background: var(--success-bg, #E1F7EC);
        color: var(--success-ink, #0E7A4C);
      }
      .tag.closed-tag {
        background: var(--danger-bg, #FBE7E5);
        color: var(--danger, #C5413B);
      }
    `
  ];

  static properties = {
    showNewModal: { type: Boolean }
  };

  constructor() {
    super();
    this.showNewModal = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  handleCardClick(preset) {
    const isClosed = preset.status === 'CLOSED';
    const isAdmin = authService.isAdmin();

    if (isClosed && !isAdmin) {
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message: '🔒 This session is closed by the secretary and no longer accepts attendance.' }
      }));
      return;
    }

    this.selectEvent(preset);
  }

  selectEvent(preset) {
    const formattedDate = new Date(preset.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const label = `${formattedDate} (${preset.period})`;

    store.setCurrentSession({
      label,
      eventName: preset.title,
      eventId: preset.id,
      status: preset.status || 'OPEN'
    });

    window.dispatchEvent(new CustomEvent('app-toast', {
      detail: { message: `Active session: ${preset.title} (${preset.period})` }
    }));

    router.navigate('scanner');
  }

  toggleStatus(e, preset) {
    e.stopPropagation();
    const isClosed = preset.status === 'CLOSED';
    const actionWord = isClosed ? 'Re-open' : 'Close';

    if (confirm(`${actionWord} attendance for "${preset.title} (${preset.period})"?\n\n${isClosed ? 'Scanners will be able to log entries again.' : 'Scanners will be blocked from logging entries into this session to prevent cheating.'}`)) {
      const newStatus = store.toggleEventStatus(preset.id);
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message: `Attendance for ${preset.title} is now ${newStatus}` }
      }));
    }
  }

  createNewEvent(e) {
    e.preventDefault();
    const titleInput = this.shadowRoot.getElementById('eventTitle');
    const dateInput = this.shadowRoot.getElementById('eventDate');
    const periodSelect = this.shadowRoot.getElementById('eventPeriod');
    const modeSelect = this.shadowRoot.getElementById('eventModes');

    const title = (titleInput && titleInput.value.trim()) || '';
    const date = (dateInput && dateInput.value) || '';
    const period = (periodSelect && periodSelect.value) || 'AM';
    const requiredModes = (modeSelect && modeSelect.value) || 'in_out';

    if (!title || !date) {
      alert('Event title and date are required.');
      return;
    }

    const newPreset = {
      id: 'EVT-' + Date.now().toString(36).toUpperCase(),
      title,
      date,
      period,
      requiredModes,
      status: 'OPEN'
    };

    store.addEventPreset(newPreset);
    this.selectEvent(newPreset);
    this.showNewModal = false;
  }

  render() {
    const state = store.getState();
    const presets = state.eventPresets || [];
    const current = state.currentSession;
    const isAdmin = authService.isAdmin();

    return html`
      <div class="card">
        <p class="card-title"><span class="tick"></span>Event & Session Selector</p>
        <p class="help-text" style="margin-bottom: 14px;">
          Choose an event session below. Scanners log into premade columns to ensure clean, consistent records without messy typos.
        </p>

        ${isAdmin ? html`
          <button
            class="btn btn-primary btn-block"
            style="margin-bottom: 16px;"
            @click="${() => { this.showNewModal = true; }}"
          >
            ＋ Create New Event Preset
          </button>
        ` : ''}

        ${presets.length === 0 ? html`
          <p class="empty-state">No premade events found. Ask the secretary to create one.</p>
        ` : presets.map(p => {
          const formattedDate = new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          const label = `${formattedDate} (${p.period})`;
          const isCurrent = current && current.eventName === p.title && current.label === label;
          const isClosed = p.status === 'CLOSED';

          return html`
            <div
              class="session-card ${isCurrent ? 'active' : ''} ${isClosed ? 'card-closed' : ''}"
              @click="${() => this.handleCardClick(p)}"
            >
              <div class="sc-header">
                <h4 class="sc-title">${p.title}</h4>
                <div style="display:flex; align-items:center; gap:6px;">
                  ${isClosed ? html`
                    <span class="tag closed-tag">🔒 CLOSED</span>
                  ` : html`
                    <span class="tag open-tag">🟢 OPEN</span>
                  `}
                  ${isCurrent ? html`<span class="tag active-tag">IN USE</span>` : ''}
                </div>
              </div>

              <p class="sc-meta">📅 ${formattedDate} · ${p.period} Session</p>

              <div class="sc-tags">
                <span class="tag period-tag">${p.period}</span>
                <span class="tag">${p.requiredModes === 'in_out' ? 'Time In + Time Out' : p.requiredModes === 'in_only' ? 'Time In Only' : 'Time Out Only'}</span>
                ${isClosed ? html`<span class="tag closed-tag">Attendance Locked</span>` : ''}
              </div>

              <!-- Admin Controls: Open / Close Attendance Toggle -->
              ${isAdmin ? html`
                <div class="sc-footer">
                  <span class="help-text" style="margin:0;">
                    ${isClosed ? 'Locked: Scanners cannot enter records.' : 'Open: Accepting real-time scans.'}
                  </span>
                  <button
                    class="btn ${isClosed ? 'btn-ghost' : 'btn-danger'} btn-sm"
                    @click="${(e) => this.toggleStatus(e, p)}"
                  >
                    ${isClosed ? '🔓 Re-open Attendance' : '🔒 Close Attendance'}
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        })}
      </div>

      <!-- New Event Preset Modal (Admin Only) -->
      <ui-modal
        .open="${this.showNewModal}"
        title="Create Premade Event"
        subtitle="This event will appear in the dropdown for all scanning devices."
        @modal-close="${() => { this.showNewModal = false; }}"
      >
        <form @submit="${this.createNewEvent}">
          <div class="field">
            <label>Event Title</label>
            <input type="text" id="eventTitle" placeholder="e.g. UAPSA General Assembly" required />
          </div>
          <div class="field">
            <label>Date</label>
            <input type="date" id="eventDate" .value="${new Date().toISOString().split('T')[0]}" required />
          </div>
          <div class="field">
            <label>Session Period</label>
            <select id="eventPeriod">
              <option value="AM">Morning (AM)</option>
              <option value="PM">Afternoon (PM)</option>
              <option value="WHOLEDAY">Whole Day</option>
            </select>
          </div>
          <div class="field">
            <label>Required Logging Modes</label>
            <select id="eventModes">
              <option value="in_out">Time In and Time Out</option>
              <option value="in_only">Time In Only</option>
              <option value="out_only">Time Out Only</option>
            </select>
          </div>
          <div class="btn-row" style="margin-top: 16px;">
            <button type="button" class="btn btn-ghost" style="flex:1;" @click="${() => { this.showNewModal = false; }}">Cancel</button>
            <button type="submit" class="btn btn-primary" style="flex:1;">Create & Use</button>
          </div>
        </form>
      </ui-modal>
    `;
  }
}

customElements.define('view-events', ViewEvents);
