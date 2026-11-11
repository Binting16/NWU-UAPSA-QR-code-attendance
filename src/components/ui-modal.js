import { LitElement, html, css } from 'lit';

export class UiModal extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 20, 30, 0.55);
      backdrop-filter: blur(2px);
      z-index: 100;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .modal-box {
      background: var(--surface, #FFFFFF);
      width: 100%;
      max-width: 480px;
      border-radius: 20px 20px 0 0;
      padding: 22px;
      max-height: 85vh;
      overflow-y: auto;
      transform: translateY(20px);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 -10px 30px rgba(10, 20, 35, 0.2);
    }

    .backdrop.open .modal-box {
      transform: translateY(0);
    }

    @media (min-width: 600px) {
      .backdrop {
        align-items: center;
        padding: 20px;
      }
      .modal-box {
        border-radius: 20px;
        transform: scale(0.95);
      }
      .backdrop.open .modal-box {
        transform: scale(1);
      }
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .modal-title-group h3 {
      font-family: var(--font-display, sans-serif);
      font-size: 17px;
      margin: 0 0 4px;
      color: var(--ink, #1A2332);
    }
    .modal-title-group p {
      margin: 0;
      font-size: 12px;
      color: var(--muted, #5B6B82);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border, #D5E5DC);
      background: var(--surface-alt, #FBFCFE);
      color: var(--muted, #5B6B82);
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }
    .close-btn:hover {
      color: var(--ink, #1A2332);
      border-color: var(--muted, #5B6B82);
    }
  `;

  static properties = {
    open: { type: Boolean, reflect: true },
    title: { type: String },
    subtitle: { type: String }
  };

  constructor() {
    super();
    this.open = false;
    this.title = '';
    this.subtitle = '';
  }

  close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  handleBackdropClick(e) {
    if (e.target.classList.contains('backdrop')) {
      this.close();
    }
  }

  render() {
    return html`
      <div class="backdrop ${this.open ? 'open' : ''}" @click="${this.handleBackdropClick}">
        <div class="modal-box" role="dialog" aria-modal="true">
          <div class="modal-header">
            <div class="modal-title-group">
              <h3>${this.title}</h3>
              ${this.subtitle ? html`<p>${this.subtitle}</p>` : ''}
            </div>
            <button class="close-btn" @click="${this.close}" title="Close">×</button>
          </div>
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('ui-modal', UiModal);
