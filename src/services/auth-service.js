import { CONFIG } from '../config.js';
import { sheetsApi } from './sheets-api.js';

class AuthService {
  constructor() {
    this.authData = this.loadAuthData();
  }

  loadAuthData() {
    try {
      const raw = localStorage.getItem(CONFIG.AUTH_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      role: CONFIG.ROLES.SCANNER, // Default open scanner mode if no auth configured yet
      token: '',
      code: '',
      updatedAt: null
    };
  }

  saveAuthData() {
    try {
      localStorage.setItem(CONFIG.AUTH_KEY, JSON.stringify(this.authData));
    } catch (e) {}
  }

  getRole() {
    return this.authData.role || CONFIG.ROLES.SCANNER;
  }

  isAdmin() {
    return this.authData.role === CONFIG.ROLES.ADMIN;
  }

  isScanner() {
    return this.authData.role === CONFIG.ROLES.SCANNER || this.authData.role === CONFIG.ROLES.ADMIN;
  }

  getToken() {
    return this.authData.token || '';
  }

  async loginWithCode(code, sheetsUrl = '') {
    const cleanCode = (code || '').trim();
    if (!cleanCode) throw new Error('Invite code cannot be empty');

    // 1. If Sheets URL is provided, verify against Sheets _Auth tab
    if (sheetsUrl) {
      try {
        const res = await sheetsApi.postAction(sheetsUrl, {
          action: 'verifyAuth',
          code: cleanCode
        });

        if (res.ok && res.role) {
          this.authData = {
            role: res.role,
            token: res.token || cleanCode,
            code: cleanCode,
            updatedAt: new Date().toISOString()
          };
          this.saveAuthData();
          return this.authData;
        }
      } catch (err) {
        // If sheet is unreachable, fall back to offline verification check
        console.warn('Online auth check failed, verifying offline fallback:', err);
      }
    }

    // 2. Local fallback convention:
    // If user enters master secretary password/code (e.g., prefix "ADMIN-" or previously saved code)
    if (cleanCode.toUpperCase().startsWith('ADMIN') || cleanCode === 'SECRETARY2026') {
      this.authData = {
        role: CONFIG.ROLES.ADMIN,
        token: 'LOCAL-ADMIN-' + Date.now(),
        code: cleanCode,
        updatedAt: new Date().toISOString()
      };
      this.saveAuthData();
      return this.authData;
    }

    // Standard scanner invite code
    this.authData = {
      role: CONFIG.ROLES.SCANNER,
      token: 'LOCAL-SCANNER-' + Date.now(),
      code: cleanCode,
      updatedAt: new Date().toISOString()
    };
    this.saveAuthData();
    return this.authData;
  }

  logout() {
    this.authData = {
      role: CONFIG.ROLES.SCANNER,
      token: '',
      code: '',
      updatedAt: null
    };
    this.saveAuthData();
  }
}

export const authService = new AuthService();
