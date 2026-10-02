import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initRouter, registerRoute } from './router';

type FakeContainer = {
  style: Record<string, string>;
};

type FakeWindow = {
  location: { hash: string };
  onHashChange?: () => void;
  addEventListener: (event: string, listener: () => void) => void;
};

const container: FakeContainer = {
  style: {
    opacity: '',
    transform: '',
    transition: '',
    pointerEvents: '',
  },
};

const fakeWindow: FakeWindow = {
  location: { hash: '' },
  addEventListener(event, listener) {
    if (event === 'hashchange') fakeWindow.onHashChange = listener;
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  container.style.opacity = '';
  container.style.transform = '';
  container.style.transition = '';
  container.style.pointerEvents = '';
  fakeWindow.location.hash = '';
  fakeWindow.onHashChange = undefined;

  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      getElementById: (id: string) => id === 'page-container' ? container : null,
      querySelectorAll: () => [],
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('router transitions', () => {
  it('reveals the page container when a route render fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    registerRoute('bills', () => {
      throw new Error('render failed');
    });
    fakeWindow.location.hash = '#bills';

    initRouter();
    await vi.advanceTimersByTimeAsync(150);

    expect(container.style.opacity).toBe('1');
    expect(container.style.transform).toBe('translateY(0)');
    expect(container.style.pointerEvents).toBe('');
    error.mockRestore();
  });

  it('does not let a stale async render hide the newer page', async () => {
    let finishBills!: () => void;
    const billsDone = new Promise<void>(resolve => { finishBills = resolve; });
    const rendered: string[] = [];

    registerRoute('bills', async () => {
      rendered.push('bills:start');
      await billsDone;
      rendered.push('bills:end');
    });
    registerRoute('dashboard', () => {
      rendered.push('dashboard');
    });
    fakeWindow.location.hash = '#bills';

    initRouter();
    await vi.advanceTimersByTimeAsync(150);
    expect(rendered).toEqual(['bills:start']);

    fakeWindow.location.hash = '#dashboard';
    fakeWindow.onHashChange?.();
    await vi.advanceTimersByTimeAsync(150);
    expect(rendered).toEqual(['bills:start', 'dashboard']);
    expect(container.style.opacity).toBe('1');

    finishBills();
    await vi.advanceTimersByTimeAsync(0);
    expect(rendered).toEqual(['bills:start', 'dashboard', 'bills:end']);
    expect(container.style.opacity).toBe('1');
    expect(container.style.transform).toBe('translateY(0)');
  });
});
