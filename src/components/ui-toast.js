import { LitElement, html, css } from 'lit';

export class UiToast extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      left: 50%;
      bottom: calc(var(--action-bar-height, 64px) + 20px);
      transform: translateX(-50%);
      z-index: 150;
      pointer-events: none;
    }

    .toast {
      background: var(--ink, #1A2332);
      color: #ffffff;
      padding: 10px 18px;
      border-radius: var(--radius-pill, 9999px);
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 18px rgba(10, 20, 35, 0.25);
      opacity: 0;
      transform: translateY(12px) scale(0.95);
      transition: opacity 0.2s ease, transform 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  `;

  static properties = {
    message: { type: String },
    visible: { type: Boolean }
  };

  constructor() {
    super();
    this.message = '';
    this.visible = false;
    this.timer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.handler = (e) => {
      if (e.detail && e.detail.message) {
        this.show(e.detail.message, e.detail.duration || 2500);
      }
    };
    window.addEventListener('app-toast', this.handler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.handler) window.removeEventListener('app-toast', this.handler);
    if (this.timer) clearTimeout(this.timer);
  }

  show(msg, duration = 2500) {
    this.message = msg;
    this.visible = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.visible = false;
    }, duration);
  }

  render() {
    return html`
      <div class="toast ${this.visible ? 'show' : ''}" role="status" aria-live="polite">
        <span>${this.message}</span>
      </div>
    `;
  }
}

customElements.define('ui-toast', UiToast);
