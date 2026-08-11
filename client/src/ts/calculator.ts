import {
  CalcOp,
  CalcState,
  initialState,
  inputDigit,
  inputOperator,
  inputEquals,
  inputClear,
  inputBackspace,
  toggleSign,
} from './utils/calculator-engine.js';

let state: CalcState = initialState();

function render() {
  const screen = document.getElementById('calc-display');
  if (screen) screen.textContent = state.display;
}

function apply(next: CalcState) {
  state = next;
  render();
}

// Mounts a persistent floating calculator button + panel once, appended to
// <body> so it survives the SPA router swapping out #page-container.
export function initCalculator() {
  if (document.getElementById('calc-widget')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <button id="calc-toggle" class="calc-fab" title="Calculator" aria-label="Open calculator">🧮</button>
    <div id="calc-widget" class="calc-widget hidden">
      <div class="calc-header">
        <span>Calculator</span>
        <button id="calc-close" class="modal-close">&times;</button>
      </div>
      <div id="calc-display" class="calc-display">0</div>
      <div class="calc-grid">
        <button data-action="clear" class="calc-btn calc-btn-fn">C</button>
        <button data-action="sign" class="calc-btn calc-btn-fn">±</button>
        <button data-action="backspace" class="calc-btn calc-btn-fn">⌫</button>
        <button data-op="÷" class="calc-btn calc-btn-op">÷</button>
        <button data-digit="7" class="calc-btn">7</button>
        <button data-digit="8" class="calc-btn">8</button>
        <button data-digit="9" class="calc-btn">9</button>
        <button data-op="×" class="calc-btn calc-btn-op">×</button>
        <button data-digit="4" class="calc-btn">4</button>
        <button data-digit="5" class="calc-btn">5</button>
        <button data-digit="6" class="calc-btn">6</button>
        <button data-op="-" class="calc-btn calc-btn-op">&minus;</button>
        <button data-digit="1" class="calc-btn">1</button>
        <button data-digit="2" class="calc-btn">2</button>
        <button data-digit="3" class="calc-btn">3</button>
        <button data-op="+" class="calc-btn calc-btn-op">+</button>
        <button data-digit="0" class="calc-btn calc-btn-zero">0</button>
        <button data-digit="." class="calc-btn">.</button>
        <button data-action="equals" class="calc-btn calc-btn-eq">=</button>
      </div>
    </div>
  `);

  const widget = document.getElementById('calc-widget');
  const toggleBtn = document.getElementById('calc-toggle');

  toggleBtn?.addEventListener('click', () => widget?.classList.toggle('hidden'));
  document.getElementById('calc-close')?.addEventListener('click', () => widget?.classList.add('hidden'));

  widget?.querySelectorAll<HTMLButtonElement>('[data-digit]').forEach((btn) => {
    btn.addEventListener('click', () => apply(inputDigit(state, btn.dataset.digit!)));
  });
  widget?.querySelectorAll<HTMLButtonElement>('[data-op]').forEach((btn) => {
    btn.addEventListener('click', () => apply(inputOperator(state, btn.dataset.op as CalcOp)));
  });
  widget?.querySelector('[data-action="equals"]')?.addEventListener('click', () => apply(inputEquals(state)));
  widget?.querySelector('[data-action="clear"]')?.addEventListener('click', () => apply(inputClear()));
  widget?.querySelector('[data-action="backspace"]')?.addEventListener('click', () => apply(inputBackspace(state)));
  widget?.querySelector('[data-action="sign"]')?.addEventListener('click', () => apply(toggleSign(state)));

  render();
}
