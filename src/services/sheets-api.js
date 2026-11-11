/**
 * Google Apps Script Relay API Client
 * Content-Type is text/plain to avoid CORS preflight (OPTIONS) in Apps Script Web Apps
 */
class SheetsApiService {
  async fetchSnapshot(sheetsUrl, token = null) {
    const url = (sheetsUrl || '').trim();
    if (!url) throw new Error('No Google Sheets URL configured');

    const query = new URLSearchParams({ action: 'snapshot' });
    if (token) query.set('token', token);

    const res = await fetch(`${url}?${query.toString()}`);
    if (!res.ok) throw new Error(`Google Sheets request failed (${res.status})`);

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Google Sheets snapshot request failed');

    return data;
  }

  async postAction(sheetsUrl, payload) {
    const url = (sheetsUrl || '').trim();
    if (!url) throw new Error('No Google Sheets URL configured');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Google Sheets write failed (${res.status})`);

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Google Sheets operation failed');

    return data;
  }
}

export const sheetsApi = new SheetsApiService();
