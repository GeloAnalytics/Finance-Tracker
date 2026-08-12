// FinanceWise — Demo Mode in-browser data store
//
// Backed by sessionStorage so edits survive a reload within the same tab,
// but a fresh tab / new visit always starts from pristine seed data.

import { createSeedData, type DemoData } from './mock-data.js';

const STORAGE_KEY = 'fw_demo_data';

let cache: DemoData | null = null;

function persist(data: DemoData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable — data still works for the rest of this page load via `cache`
  }
}

export function getDemoData(): DemoData {
  if (cache) return cache;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as DemoData;
      return cache;
    }
  } catch {
    // ignore and fall through to seeding fresh data
  }

  cache = createSeedData();
  persist(cache);
  return cache;
}

export function saveDemoData(): void {
  if (cache) persist(cache);
}
