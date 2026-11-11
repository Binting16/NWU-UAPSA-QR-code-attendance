import { css } from 'lit';

export const sharedStyles = css`
  :host {
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }

  /* Cards */
  .card {
    background: var(--surface, #FFFFFF);
    border: 1px solid var(--border, #D5E5DC);
    border-radius: var(--radius, 16px);
    padding: 16px;
    margin-bottom: 14px;
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(15, 25, 40, 0.06));
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-display, sans-serif);
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--primary, #0B6E4F);
    margin: 0 0 12px;
  }

  .card-title .tick {
    width: 6px;
    height: 14px;
    background: var(--accent, #E8A33D);
    border-radius: 2px;
    display: inline-block;
  }

  /* Form Fields */
  .field {
    margin-bottom: 12px;
  }
  .field:last-child {
    margin-bottom: 0;
  }
  .field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted, #5B6B82);
    margin-bottom: 6px;
  }
  .field input[type="text"],
  .field input[type="password"],
  .field input[type="date"],
  .field input[type="time"],
  .field select,
  .field textarea {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid var(--border, #D5E5DC);
    border-radius: 10px;
    background: var(--surface-alt, #FBFCFE);
    color: var(--ink, #1A2332);
    font-family: inherit;
    font-size: 14px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .field input:focus,
  .field select:focus,
  .field textarea:focus {
    outline: none;
    border-color: var(--primary, #0B6E4F);
    box-shadow: 0 0 0 3px var(--primary-tint, #DFF3EA);
  }
  .help-text {
    font-size: 11.5px;
    color: var(--muted, #5B6B82);
    margin-top: 4px;
    line-height: 1.45;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: var(--radius-md, 12px);
    border: 1px solid transparent;
    font-family: inherit;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    line-height: 1;
    transition: transform 0.1s ease, filter 0.15s ease, background 0.15s ease;
    user-select: none;
    -webkit-user-select: none;
  }
  .btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-sm {
    min-height: 34px;
    padding: 0 12px;
    font-size: 12.5px;
    border-radius: 9px;
  }
  .btn-block {
    width: 100%;
  }
  .btn-primary {
    background: var(--primary, #0B6E4F);
    color: #ffffff;
    box-shadow: 0 2px 0 var(--primary-dark, #063D2B);
  }
  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.05);
  }
  .btn-accent {
    background: var(--accent, #E8A33D);
    color: #3A2700;
    box-shadow: 0 2px 0 var(--accent-dark, #C5841F);
  }
  .btn-accent:hover:not(:disabled) {
    filter: brightness(1.04);
  }
  .btn-ghost {
    background: var(--surface, #FFFFFF);
    color: var(--primary, #0B6E4F);
    border-color: var(--border, #D5E5DC);
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--surface-alt, #FBFCFE);
    border-color: var(--primary, #0B6E4F);
  }
  .btn-danger {
    background: var(--danger-bg, #FBE7E5);
    color: var(--danger, #C5413B);
    border-color: var(--danger-border, #F0C5C2);
  }
  .btn-danger:hover:not(:disabled) {
    background: #F8D6D3;
  }

  .btn-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Grid Layouts */
  .row2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  @media (max-width: 520px) {
    .row2 {
      grid-template-columns: 1fr;
    }
  }

  .divider {
    height: 1px;
    background: var(--border, #D5E5DC);
    margin: 16px 0;
  }

  /* Status Chips */
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--radius-pill, 9999px);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
  }
  .chip-primary {
    background: var(--primary-tint, #DFF3EA);
    color: var(--primary, #0B6E4F);
  }
  .chip-accent {
    background: var(--accent-tint, #FFF8EA);
    color: var(--accent-dark, #C5841F);
  }
  .chip-success {
    background: var(--success-bg, #E1F7EC);
    color: var(--success-ink, #0E7A4C);
  }
  .chip-danger {
    background: var(--danger-bg, #FBE7E5);
    color: var(--danger, #C5413B);
  }

  /* Hidden utilities */
  .hidden {
    display: none !important;
  }
`;
