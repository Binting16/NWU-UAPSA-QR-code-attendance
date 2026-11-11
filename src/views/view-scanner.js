import { LitElement, html } from 'lit';
import { store } from '../state/store.js';
import { audioService } from '../services/audio-service.js';
import { CONFIG } from '../config.js';

export class ViewScanner extends LitElement {
  // Render in Light DOM so html5-qrcode's document.getElementById('qr-reader') works natively
  createRenderRoot() {
    return this;
  }

  static properties = {
    isScanning: { type: Boolean },
    scanMode: { type: String },
    resultBanner: { type: Object },
    cameras: { type: Array },
    selectedCamera: { type: String },
    addModalOpen: { type: Boolean },
    unknownId: { type: String }
  };

  constructor() {
    super();
    this.isScanning = false;
    this.scanMode = store.getState().scanMode || 'in';
    this.resultBanner = { kind: '', icon: '📷', title: 'Ready to scan', meta: '', status: '', absences: null };
    this.cameras = [];
    this.selectedCamera = '';
    this.html5QrCode = null;
    this.lastScan = { text: null, time: 0 };
    this.addModalOpen = false;
    this.unknownId = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => {
      this.scanMode = store.getState().scanMode;
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    this.stopScanner();
  }

  async populateCameraList() {
    const Html5Qrcode = window.Html5Qrcode;
    if (Html5Qrcode && Html5Qrcode.getCameras) {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          this.cameras = devices;
          if (!this.selectedCamera) {
            this.selectedCamera = devices[0].id;
          }
          this.requestUpdate();
        }
      } catch (e) {
        console.warn('Could not enumerate cameras:', e);
      }
    }
  }

  async startScanner() {
    const Html5Qrcode = window.Html5Qrcode;
    if (!Html5Qrcode) {
      alert('Camera library failed to load. Please check your internet connection and reload the page.');
      return;
    }

    const readerEl = document.getElementById('qr-reader');
    if (!readerEl) {
      console.error('DOM Element #qr-reader not found');
      return;
    }

    // Check secure context
    if (!window.isSecureContext) {
      alert('Camera access requires HTTPS or localhost. Ensure the address begins with https://.');
      return;
    }

    // Stop existing instance if any
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.stop();
      } catch (e) {}
    }

    this.html5QrCode = new Html5Qrcode('qr-reader', { verbose: false });

    // Dynamic responsive qrbox sizing function to prevent oversized qrbox crashes
    const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const edgeSize = Math.max(180, Math.floor(minEdge * 0.72));
      return { width: edgeSize, height: edgeSize };
    };

    const cfg = {
      fps: 10,
      qrbox: qrboxFunction
    };

    // If a specific camera ID was selected by the user, use it
    if (this.selectedCamera) {
      try {
        await this.html5QrCode.start(
          { deviceId: { exact: this.selectedCamera } },
          cfg,
          (decodedText) => this.handleScan(decodedText),
          () => {}
        );
        this.isScanning = true;
        this.populateCameraList();
        this.requestUpdate();
        return;
      } catch (err) {
        console.warn('Starting selected camera failed, falling back to facingMode:', err);
      }
    }

    // Mobile-first: attempt rear camera ('environment')
    try {
      await this.html5QrCode.start(
        { facingMode: 'environment' },
        cfg,
        (decodedText) => this.handleScan(decodedText),
        () => {}
      );
      this.isScanning = true;
      this.populateCameraList();
      this.requestUpdate();
      return;
    } catch (errEnv) {
      console.warn('Rear camera not available or failed (common on desktop/laptops):', errEnv);

      // Desktop/Laptop fallback: attempt user-facing webcam
      try {
        await this.html5QrCode.start(
          { facingMode: 'user' },
          cfg,
          (decodedText) => this.handleScan(decodedText),
          () => {}
        );
        this.isScanning = true;
        this.populateCameraList();
        this.requestUpdate();
        return;
      } catch (errUser) {
        console.error('All camera attempts failed:', errUser);
        const name = (errUser && errUser.name) ? errUser.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          alert('Camera permission was denied. On mobile, check your browser site settings and allow camera access.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          alert('No camera was detected on this device.');
        } else if (name === 'NotReadableError') {
          alert('The camera is in use by another app or tab. Please close other camera apps and retry.');
        } else {
          alert(`Could not start camera: ${errUser.message || errUser}.`);
        }
      }
    }
  }

  async stopScanner() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
      } catch (e) {}
      this.isScanning = false;
      this.requestUpdate();
    }
  }

  async switchCamera() {
    if (!this.cameras || this.cameras.length < 2) return;
    const curIdx = this.cameras.findIndex(c => c.id === this.selectedCamera);
    const nextIdx = (curIdx + 1) % this.cameras.length;
    this.selectedCamera = this.cameras[nextIdx].id;
    if (this.isScanning) {
      await this.stopScanner();
      await this.startScanner();
    }
  }

  handleScan(rawText) {
    const now = Date.now();
    if (rawText === this.lastScan.text && now - this.lastScan.time < CONFIG.DUPLICATE_SCAN_COOLDOWN_MS) {
      return;
    }
    this.lastScan = { text: rawText, time: now };
    this.processScannedId(rawText);
  }

  processScannedId(rawText) {
    const outcome = store.recordScan(rawText);

    if (!outcome.ok) {
      // Event Session Closed - Anti-cheating guard!
      if (outcome.reason === 'event-closed') {
        audioService.playError();
        this.resultBanner = {
          kind: 'unknown',
          icon: '🔒',
          title: 'Attendance Closed',
          meta: `${outcome.eventName || 'This session'} has been closed by the secretary to prevent unauthorized entries.`,
          status: 'ATTENDANCE CLOSED'
        };
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { message: '🔒 Attendance is closed for this session' }
        }));
        return;
      }

      if (outcome.reason === 'no-session') {
        audioService.playError();
        this.resultBanner = {
          kind: 'unknown',
          icon: '⚠️',
          title: 'No Event Picked',
          meta: 'Tap the event pill at top to select an event first',
          status: 'NO EVENT'
        };
        return;
      }

      if (outcome.reason === 'not-found' || outcome.reason === 'not-in-locked-group') {
        audioService.playError();
        this.resultBanner = {
          kind: 'unknown',
          icon: '⚠️',
          title: 'ID Not Recognized',
          meta: outcome.id,
          status: 'UNKNOWN ID'
        };
        this.unknownId = outcome.id;
        this.addModalOpen = true;
        return;
      }
      return;
    }

    if (outcome.duplicate) {
      audioService.playDuplicate();
      this.resultBanner = {
        kind: 'duplicate',
        icon: '🔁',
        title: outcome.student.name || outcome.student.id,
        meta: `${outcome.student.id} · ${outcome.groupName}`,
        status: `${outcome.mode === 'out' ? 'TIME OUT' : 'TIME IN'} ALREADY LOGGED (${outcome.existingTime})`,
        absences: outcome.absences
      };
      return;
    }

    // Scan Success
    audioService.playSuccess();
    this.resultBanner = {
      kind: 'success',
      icon: outcome.mode === 'out' ? '🔴' : '✅',
      title: outcome.student.name || outcome.student.id,
      meta: `${outcome.student.id} · ${outcome.groupName}`,
      status: `${outcome.mode === 'out' ? 'TIME OUT' : 'TIME IN'} · ${outcome.time}`,
      absences: outcome.absences
    };
  }

  submitManual() {
    const input = document.getElementById('manualInput');
    if (!input) return;
    const val = input.value.trim();
    input.value = '';
    if (val) this.processScannedId(val);
    input.focus();
  }

  handleManualKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.submitManual();
    }
  }

  saveNewStudentModal(e) {
    e.preventDefault();
    const idInput = document.getElementById('newStudentId');
    const nameInput = document.getElementById('newStudentName');
    const groupSelect = document.getElementById('newStudentGroup');
    const markPresent = document.getElementById('newStudentMarkPresent');

    const id = (idInput && idInput.value) || '';
    const name = (nameInput && nameInput.value) || '';
    const group = (groupSelect && groupSelect.value) || '';
    const shouldMark = markPresent ? markPresent.checked : true;

    if (!id || !group) {
      alert('Student ID and Group are required.');
      return;
    }

    store.addOrUpdateStudent(id, name, group, shouldMark);
    this.addModalOpen = false;
    audioService.playSuccess();
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Added ${name || id} to ${group}` } }));
  }

  render() {
    const state = store.getState();
    const mode = this.scanMode;
    const isClosed = store.isSessionClosed(state.currentSession);

    return html`
      <style>
        .scanner-container {
          padding: 16px;
          max-width: 600px;
          margin: 0 auto;
        }

        .viewfinder-card {
          padding: 14px;
          position: relative;
        }

        .viewfinder {
          position: relative;
          width: 100%;
          max-width: 380px;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          background: #0B1320;
          border-radius: var(--radius-lg, 20px);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }

        #qr-reader {
          width: 100%;
          height: 100%;
          position: relative;
        }
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .vf-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
          justify-content: center;
          color: #A9B7CC;
          text-align: center;
          padding: 24px;
          font-size: 13px;
          background: #0B1320;
          z-index: 1;
        }
        .vf-placeholder svg {
          width: 40px;
          height: 40px;
          opacity: 0.7;
        }

        .bracket {
          position: absolute;
          width: 32px;
          height: 32px;
          border-color: var(--accent, #E8A33D);
          pointer-events: none;
          z-index: 2;
        }
        .bracket.tl { top: 14px; left: 14px; border-top: 4px solid; border-left: 4px solid; border-top-left-radius: 8px; }
        .bracket.tr { top: 14px; right: 14px; border-top: 4px solid; border-right: 4px solid; border-top-right-radius: 8px; }
        .bracket.bl { bottom: 14px; left: 14px; border-bottom: 4px solid; border-left: 4px solid; border-bottom-left-radius: 8px; }
        .bracket.br { bottom: 14px; right: 14px; border-bottom: 4px solid; border-right: 4px solid; border-bottom-right-radius: 8px; }

        .scanline {
          position: absolute;
          left: 10%;
          right: 10%;
          height: 2px;
          top: 14px;
          z-index: 2;
          background: linear-gradient(90deg, transparent, var(--accent, #E8A33D), transparent);
          box-shadow: 0 0 12px 2px var(--accent, #E8A33D);
          opacity: 0;
        }
        .viewfinder.is-scanning .scanline {
          opacity: 1;
          animation: sweep 2.4s ease-in-out infinite;
        }
        @keyframes sweep {
          0% { top: 14px; }
          50% { top: calc(100% - 16px); }
          100% { top: 14px; }
        }

        .scan-mode-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .mode-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          border-radius: 12px;
          border: 1.5px solid var(--border, #D5E5DC);
          background: var(--surface-alt, #FBFCFE);
          color: var(--muted, #5B6B82);
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mode-btn .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #C2CCDA;
        }
        .mode-btn.active.mode-in {
          border-color: transparent;
          background: var(--success-bg, #E1F7EC);
          color: var(--success-ink, #0E7A4C);
        }
        .mode-btn.active.mode-in .dot {
          background: var(--success, #22B573);
        }
        .mode-btn.active.mode-out {
          border-color: transparent;
          background: var(--danger-bg, #FBE7E5);
          color: var(--danger, #C5413B);
        }
        .mode-btn.active.mode-out .dot {
          background: var(--danger, #C5413B);
        }

        .scanner-controls {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .scan-panel {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
          padding: 14px 18px;
          border-radius: var(--radius, 16px);
          border: 2px dashed var(--border, #D5E5DC);
          background: var(--surface-alt, #FBFCFE);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .scan-panel.success {
          border-style: solid;
          border-color: var(--success, #22B573);
          background: var(--success-bg, #E1F7EC);
        }
        .scan-panel.duplicate {
          border-style: solid;
          border-color: var(--accent, #E8A33D);
          background: var(--warn-bg, #FCF1DA);
        }
        .scan-panel.unknown {
          border-style: solid;
          border-color: var(--danger, #C5413B);
          background: var(--danger-bg, #FBE7E5);
        }

        .sp-icon {
          font-size: 36px;
          line-height: 1;
          width: 44px;
          text-align: center;
          flex-shrink: 0;
        }
        .sp-main {
          flex: 1 1 auto;
          min-width: 0;
        }
        .sp-name {
          margin: 0;
          font-weight: 800;
          font-size: clamp(20px, 2.5vw, 32px);
          line-height: 1.15;
          letter-spacing: -0.01em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .scan-panel.success .sp-name { color: var(--success-ink, #0E7A4C); }
        .scan-panel.duplicate .sp-name { color: var(--warn, #B8841A); }
        .scan-panel.unknown .sp-name { color: var(--danger, #C5413B); }

        .sp-meta {
          margin: 3px 0 0;
          font-size: 13.5px;
          color: var(--muted, #5B6B82);
          font-family: var(--font-mono, monospace);
        }
        .sp-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
          flex-shrink: 0;
        }

        .closed-banner {
          background: var(--danger-bg, #FBE7E5);
          border: 1px solid var(--danger-border, #F0C5C2);
          color: var(--danger, #C5413B);
          padding: 10px 14px;
          border-radius: 12px;
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .manual-entry-row {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }
        .manual-entry-row input {
          flex: 1;
          border-style: dashed;
        }
      </style>

      <div class="scanner-container">
        <!-- Anti-Cheating Closed Session Notice -->
        ${isClosed ? html`
          <div class="closed-banner">
            <span>🔒</span>
            <span>ATTENDANCE IS CLOSED for this session. Entries are disabled to prevent cheating.</span>
          </div>
        ` : ''}

        <!-- Mode Toggle (Time In vs Time Out) -->
        <div class="scan-mode-toggle" role="group" aria-label="Scan mode">
          <button
            type="button"
            class="mode-btn mode-in ${mode === 'in' ? 'active' : ''}"
            @click="${() => store.setScanMode('in')}"
          >
            <span class="dot"></span>
            <span>Time In</span>
          </button>
          <button
            type="button"
            class="mode-btn mode-out ${mode === 'out' ? 'active' : ''}"
            @click="${() => store.setScanMode('out')}"
          >
            <span class="dot"></span>
            <span>Time Out</span>
          </button>
        </div>

        <!-- Giant Scan Result Banner -->
        <div class="scan-panel ${this.resultBanner.kind}" aria-live="polite">
          <div class="sp-icon">${this.resultBanner.icon}</div>
          <div class="sp-main">
            <p class="sp-name">${this.resultBanner.title}</p>
            <p class="sp-meta">${this.resultBanner.meta}</p>
          </div>
          <div class="sp-side">
            ${this.resultBanner.status ? html`
              <span class="chip ${this.resultBanner.kind === 'success' ? 'chip-success' : this.resultBanner.kind === 'duplicate' ? 'chip-accent' : 'chip-danger'}">
                ${this.resultBanner.status}
              </span>
            ` : ''}
            ${typeof this.resultBanner.absences === 'number' ? html`
              <span class="help-text" style="font-weight:700; color:${this.resultBanner.absences > 0 ? 'var(--danger)' : 'var(--muted)'};">
                ${this.resultBanner.absences === 0 ? 'No absences' : `Absences: ${this.resultBanner.absences}`}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Camera Viewfinder Card -->
        <div class="card viewfinder-card">
          <div class="viewfinder ${this.isScanning ? 'is-scanning' : ''}" id="viewfinder">
            <!-- Global #qr-reader rendered in Light DOM -->
            <div id="qr-reader"></div>
            ${!this.isScanning ? html`
              <div class="vf-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 7V5a1 1 0 011-1h2M20 7V5a1 1 0 00-1-1h-2M4 17v2a1 1 0 001 1h2M20 17v2a1 1 0 01-1 1h-2" stroke-linecap="round" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
                <span>Point camera at QR code or use barcode scanner</span>
              </div>
            ` : ''}
            <div class="bracket tl"></div>
            <div class="bracket tr"></div>
            <div class="bracket bl"></div>
            <div class="bracket br"></div>
            <div class="scanline"></div>
          </div>

          <div class="scanner-controls">
            ${!this.isScanning ? html`
              <button class="btn btn-primary" @click="${this.startScanner}">📷 Start Camera</button>
            ` : html`
              <button class="btn btn-ghost" @click="${this.stopScanner}">⏹ Stop Camera</button>
              ${this.cameras.length > 1 ? html`
                <button class="btn btn-ghost" @click="${this.switchCamera}" title="Switch Camera">🔄 Switch</button>
              ` : ''}
            `}
          </div>

          ${this.cameras.length > 1 ? html`
            <div class="field" style="margin-top:10px;">
              <label>Select Camera Device</label>
              <select @change="${async (e) => {
                this.selectedCamera = e.target.value;
                if (this.isScanning) {
                  await this.stopScanner();
                  await this.startScanner();
                }
              }}">
                ${this.cameras.map(c => html`<option value="${c.id}" ?selected="${c.id === this.selectedCamera}">${c.label || c.id}</option>`)}
              </select>
            </div>
          ` : ''}
        </div>

        <!-- Manual ID / USB Barcode Input -->
        <div class="card">
          <p class="card-title"><span class="tick"></span>Manual / USB Barcode Scanner</p>
          <div class="field">
            <label for="manualInput">Type Student ID or scan with USB Gun</label>
            <div class="manual-entry-row">
              <input
                type="text"
                id="manualInput"
                placeholder="e.g. 24-01902"
                autocomplete="off"
                @keydown="${this.handleManualKeyDown}"
              />
              <button type="button" class="btn btn-primary btn-sm" @click="${this.submitManual}">Submit</button>
            </div>
            <p class="help-text">USB Barcode guns automatically submit upon reading.</p>
          </div>
        </div>

        <!-- Modal: Unrecognized ID Add Dialog -->
        <ui-modal
          .open="${this.addModalOpen}"
          title="Unrecognized Student ID"
          subtitle="This student is not in any group roster yet. Add them now?"
          @modal-close="${() => { this.addModalOpen = false; }}"
        >
          <form @submit="${this.saveNewStudentModal}">
            <div class="field">
              <label>Student ID</label>
              <input type="text" id="newStudentId" .value="${this.unknownId}" required />
            </div>
            <div class="field">
              <label>Full Name</label>
              <input type="text" id="newStudentName" placeholder="Last, First M.I." />
            </div>
            <div class="field">
              <label>Group / Section</label>
              <select id="newStudentGroup" required>
                ${state.groupOrder.map(g => html`<option value="${g}">${g}</option>`)}
              </select>
            </div>
            <div class="field" style="margin: 12px 0;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="newStudentMarkPresent" checked style="width:18px; height:18px;" />
                <span>Mark present for current event session</span>
              </label>
            </div>
            <div class="btn-row" style="margin-top: 16px;">
              <button type="button" class="btn btn-ghost" style="flex:1;" @click="${() => { this.addModalOpen = false; }}">Cancel</button>
              <button type="submit" class="btn btn-primary" style="flex:1;">Save Student</button>
            </div>
          </form>
        </ui-modal>
      </div>
    `;
  }
}

customElements.define('view-scanner', ViewScanner);
