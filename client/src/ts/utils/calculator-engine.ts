// Pure state-machine logic for a standard 4-function calculator.
// Kept free of the DOM so it's directly testable.

export type CalcOp = '+' | '-' | '×' | '÷';

export interface CalcState {
  display: string;
  accumulator: number | null;
  pendingOp: CalcOp | null;
  overwrite: boolean;
}

export function initialState(): CalcState {
  return { display: '0', accumulator: null, pendingOp: null, overwrite: true };
}

function applyOp(a: number, b: number, op: CalcOp): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
  }
}

function formatResult(n: number): string {
  if (!isFinite(n)) return 'Error';
  if (Number.isInteger(n)) return String(n);
  // Trim floating-point noise (e.g. 0.1 + 0.2) without losing real precision.
  return parseFloat(n.toFixed(10)).toString();
}

export function inputDigit(state: CalcState, digit: string): CalcState {
  if (state.display === 'Error') return { ...initialState(), display: digit === '.' ? '0.' : digit, overwrite: false };
  if (state.overwrite) {
    return { ...state, display: digit === '.' ? '0.' : digit, overwrite: false };
  }
  if (digit === '.' && state.display.includes('.')) return state;
  if (state.display === '0' && digit !== '.') {
    return { ...state, display: digit };
  }
  return { ...state, display: state.display + digit };
}

export function inputOperator(state: CalcState, op: CalcOp): CalcState {
  if (state.display === 'Error') return initialState();
  const current = parseFloat(state.display);
  if (state.accumulator === null) {
    return { display: state.display, accumulator: current, pendingOp: op, overwrite: true };
  }
  if (state.overwrite) {
    return { ...state, pendingOp: op };
  }
  const result = applyOp(state.accumulator, current, state.pendingOp as CalcOp);
  return { display: formatResult(result), accumulator: result, pendingOp: op, overwrite: true };
}

export function inputEquals(state: CalcState): CalcState {
  if (state.pendingOp === null || state.accumulator === null) return state;
  const current = parseFloat(state.display);
  const result = applyOp(state.accumulator, current, state.pendingOp);
  return { display: formatResult(result), accumulator: null, pendingOp: null, overwrite: true };
}

export function inputClear(): CalcState {
  return initialState();
}

export function inputBackspace(state: CalcState): CalcState {
  if (state.overwrite || state.display === 'Error') return state;
  const next = state.display.slice(0, -1);
  return { ...state, display: next === '' || next === '-' ? '0' : next, overwrite: next === '' };
}

export function toggleSign(state: CalcState): CalcState {
  if (state.display === '0' || state.display === 'Error') return state;
  return { ...state, display: state.display.startsWith('-') ? state.display.slice(1) : '-' + state.display };
}
