import { describe, it, expect } from 'vitest';
import {
  initialState,
  inputDigit,
  inputOperator,
  inputEquals,
  inputClear,
  inputBackspace,
  toggleSign,
} from './calculator-engine';

function run(actions: ((s: ReturnType<typeof initialState>) => ReturnType<typeof initialState>)[]) {
  return actions.reduce((s, action) => action(s), initialState());
}

describe('calculator-engine', () => {
  it('builds up a multi-digit number', () => {
    const s = run([(s) => inputDigit(s, '1'), (s) => inputDigit(s, '2'), (s) => inputDigit(s, '3')]);
    expect(s.display).toBe('123');
  });

  it('performs addition', () => {
    const s = run([
      (s) => inputDigit(s, '2'),
      (s) => inputOperator(s, '+'),
      (s) => inputDigit(s, '3'),
      (s) => inputEquals(s),
    ]);
    expect(s.display).toBe('5');
  });

  it('chains operations left-to-right like a basic calculator', () => {
    // 2 + 3 * 4 => (2+3) then *4 => 20, not 14
    const s = run([
      (s) => inputDigit(s, '2'),
      (s) => inputOperator(s, '+'),
      (s) => inputDigit(s, '3'),
      (s) => inputOperator(s, '×'),
      (s) => inputDigit(s, '4'),
      (s) => inputEquals(s),
    ]);
    expect(s.display).toBe('20');
  });

  it('returns Error on divide by zero', () => {
    const s = run([
      (s) => inputDigit(s, '5'),
      (s) => inputOperator(s, '÷'),
      (s) => inputDigit(s, '0'),
      (s) => inputEquals(s),
    ]);
    expect(s.display).toBe('Error');
  });

  it('handles decimal input and trims floating point noise', () => {
    const s = run([
      (s) => inputDigit(s, '0'),
      (s) => inputDigit(s, '.'),
      (s) => inputDigit(s, '1'),
      (s) => inputOperator(s, '+'),
      (s) => inputDigit(s, '0'),
      (s) => inputDigit(s, '.'),
      (s) => inputDigit(s, '2'),
      (s) => inputEquals(s),
    ]);
    expect(s.display).toBe('0.3');
  });

  it('backspace removes the last digit', () => {
    const s = run([(s) => inputDigit(s, '1'), (s) => inputDigit(s, '2'), (s) => inputBackspace(s)]);
    expect(s.display).toBe('1');
  });

  it('backspace on a single digit resets to 0', () => {
    const s = run([(s) => inputDigit(s, '7'), (s) => inputBackspace(s)]);
    expect(s.display).toBe('0');
  });

  it('toggles sign', () => {
    const s = run([(s) => inputDigit(s, '5'), (s) => toggleSign(s)]);
    expect(s.display).toBe('-5');
  });

  it('clear resets to initial state', () => {
    const s = run([(s) => inputDigit(s, '9'), (s) => inputOperator(s, '+'), () => inputClear()]);
    expect(s).toEqual(initialState());
  });

  it('recovers from an Error state on next digit press', () => {
    const errored = run([
      (s) => inputDigit(s, '1'),
      (s) => inputOperator(s, '÷'),
      (s) => inputDigit(s, '0'),
      (s) => inputEquals(s),
    ]);
    const s = inputDigit(errored, '9');
    expect(s.display).toBe('9');
  });
});
