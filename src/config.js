/**
 * NWU UAPSA QR Code Attendance - Global Configuration
 */
export const CONFIG = {
  APP_ID: 'qr-attendance-app',
  BUILD_TAG: 'modular-lit-v2.0-2026',
  STORAGE_KEY: 'qrAttendanceApp_v2',
  SETTINGS_KEY: 'qrAttendanceApp_settings_v2',
  AUTH_KEY: 'qrAttendanceApp_auth_v2',

  DUPLICATE_SCAN_COOLDOWN_MS: 3000,
  AUTO_SYNC_INTERVAL_MS: 30000,
  RETRY_QUEUE_INTERVAL_MS: 15000,

  COLUMN_WIDTH_PRESETS: {
    compact: { name: '110px', id: '80px' },
    normal: { name: '160px', id: '96px' },
    wide: { name: '220px', id: '120px' }
  },

  DEFAULT_EXPORT_NAME: 'Attendance',

  ROLES: {
    ADMIN: 'ADMIN',       // Secretary with full administrative privileges
    SCANNER: 'SCANNER',   // Representative with scanning & viewing privileges
    GUEST: 'GUEST'        // Unauthenticated / restricted preview
  }
};
