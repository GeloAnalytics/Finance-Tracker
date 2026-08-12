// FinanceWise — Demo Mode flag
//
// Demo mode never talks to the real backend: no login, no cookies, no
// database. Everything lives in sessionStorage so a closed tab always comes
// back to pristine seed data, while a reload mid-session keeps edits.

const DEMO_FLAG_KEY = 'fw_demo_mode';

export function isDemoMode(): boolean {
  try {
    return sessionStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function enterDemoMode(): void {
  try {
    sessionStorage.setItem(DEMO_FLAG_KEY, '1');
  } catch {
    // sessionStorage unavailable (e.g. privacy mode) — demo just won't persist across reloads
  }
}

export function exitDemoMode(): void {
  try {
    sessionStorage.removeItem(DEMO_FLAG_KEY);
    sessionStorage.removeItem('fw_demo_data');
  } catch {
    // ignore
  }
}
