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
        cursor: pointer;
        margin-bottom: 12px;
        transition: all 0.15s ease;
      }
      .session-card:hover {
        border-color: var(--primary, #0B6E4F);
        transform: translateY(-1px);
      }
      .session-card.active {
        border-color: var(--primary, #0B6E4F);
        background: var(--primary-tint, #DFF3EA);
        box-shadow: 0 4px 12px rgba(11, 110, 79, 0.12);
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
        margin: 0 0 8px;
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
      eventId: preset.id
    });

    window.dispatchEvent(new CustomEvent('app-toast', {
      detail: { message: `Active session: ${preset.title} (${preset.period})` }
    }));

    router.navigate('scanner');
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
      status: 'ACTIVE'
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

          return html`
            <div
              class="session-card ${isCurrent ? 'active' : ''}"
              @click="${() => this.selectEvent(p)}"
            >
              <div class="sc-header">
                <h4 class="sc-title">${p.title}</h4>
                ${isCurrent ? html`<span class="tag active-tag">IN USE</span>` : ''}
              </div>
              <p class="sc-meta">📅 ${formattedDate} · ${p.period} Session</p>
              <div class="sc-tags">
                <span class="tag period-tag">${p.period}</span>
                <span class="tag">${p.requiredModes === 'in_out' ? 'Time In + Time Out' : p.requiredModes === 'in_only' ? 'Time In Only' : 'Time Out Only'}</span>
              </div>
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
