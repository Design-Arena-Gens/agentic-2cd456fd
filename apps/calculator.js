import { createElement } from "../js/utils.js";

const STANDARD_BUTTONS = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "="]
];

const SCIENTIFIC_PREFIX = [
  ["2nd", "(", ")", "mc", "m+", "m−", "mr"],
  ["x²", "x³", "xʸ", "eˣ", "10ˣ", "ln", "log₁₀"],
  ["x!", "sin", "cos", "tan", "sinh", "cosh", "tanh"],
  ["√x", "∛x", "y√x", "1/x", "Rand", "π", "EE"]
];

export const CalculatorApp = {
  id: "calculator",
  title: "Calculator",
  icon: "images/calculator.svg",
  persist: true,
  menuDefinition: [
    {
      id: "calculator-menu",
      label: "Calculator",
      items: [
        { label: "About Calculator", action: "system:about" },
        { divider: true },
        { label: "Quit Calculator", action: "window:close-active", shortcut: "⌘Q" }
      ]
    },
    {
      id: "view-menu",
      label: "View",
      items: [
        { label: "Basic", action: "calculator:set-mode", payload: "basic" },
        { label: "Scientific", action: "calculator:set-mode", payload: "scientific" }
      ]
    },
    {
      id: "edit-menu",
      label: "Edit",
      items: [
        { label: "Copy", action: "calculator:copy", shortcut: "⌘C" },
        { label: "Paste", action: "calculator:paste", shortcut: "⌘V" }
      ]
    }
  ],
  createInstance(container, windowId, { eventBus }) {
    const calculator = new CalculatorInstance(container, windowId, eventBus);
    return {
      destroy: () => calculator.destroy()
    };
  }
};

class CalculatorInstance {
  constructor(container, windowId, eventBus) {
    this.container = container;
    this.windowId = windowId;
    this.eventBus = eventBus;
    this.mode = "basic";
    this.memory = 0;
    this.buffer = "0";
    this.operands = [];
    this.operator = null;
    this.build();
    this.registerEvents();
  }

  build() {
    this.container.innerHTML = "";
    this.wrapper = createElement("div", { class: "calculator" });
    this.display = createElement("div", { class: "calculator-display", text: this.buffer });
    this.wrapper.appendChild(this.display);
    this.renderButtons();
    this.container.appendChild(this.wrapper);
  }

  renderButtons() {
    this.wrapper.querySelectorAll("button")?.forEach((button) => button.remove());
    const layout = this.mode === "scientific" ? [...SCIENTIFIC_PREFIX, ...STANDARD_BUTTONS] : STANDARD_BUTTONS;
    layout.forEach((row) => {
      row.forEach((label) => {
        const button = createElement("button", { text: label });
        if (["÷", "×", "−", "+", "="].includes(label)) button.classList.add("operator");
        if (["C", "±", "%"].includes(label)) button.classList.add("secondary");
        if (row === STANDARD_BUTTONS[4] && label === "0") {
          button.style.gridColumn = "1 / span 2";
        }
        button.addEventListener("click", () => this.handleInput(label));
        this.wrapper.appendChild(button);
      });
    });
    this.wrapper.classList.toggle("scientific", this.mode === "scientific");
  }

  registerEvents() {
    this.keyHandler = (event) => this.onKey(event);
    window.addEventListener("keydown", this.keyHandler);
    this.eventBusSubscription = this.eventBus.subscribe("calculator:set-mode", (payload) => {
      const mode = typeof payload === "string" ? payload : payload?.payload;
      if (!mode) return;
      this.mode = mode;
      this.renderButtons();
    });
    this.copySubscription = this.eventBus.subscribe("calculator:copy", () => navigator.clipboard?.writeText?.(this.buffer));
    this.pasteSubscription = this.eventBus.subscribe("calculator:paste", () => {
      navigator.clipboard?.readText?.().then((text) => {
        if (!Number.isNaN(Number(text))) {
          this.buffer = text;
          this.updateDisplay();
        }
      });
    });
  }

  onKey(event) {
    if (event.metaKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      navigator.clipboard?.writeText?.(this.buffer);
      return;
    }
    if (event.metaKey && event.key.toLowerCase() === "v") {
      event.preventDefault();
      navigator.clipboard?.readText?.().then((text) => {
        if (!Number.isNaN(Number(text))) {
          this.buffer = text;
          this.updateDisplay();
        }
      });
      return;
    }
    const map = {
      "+": "+",
      "-": "−",
      "*": "×",
      "/": "÷",
      Enter: "=",
      "=": "=",
      Escape: "C",
      "%": "%",
      ".": "."
    };
    const label = map[event.key] ?? (/\d/.test(event.key) ? event.key : null);
    if (label) {
      event.preventDefault();
      this.handleInput(label);
    }
  }

  handleInput(label) {
    if (!Number.isNaN(Number(label))) {
      this.inputDigit(label);
      return;
    }
    switch (label) {
      case "C":
        this.reset();
        break;
      case "±":
        this.buffer = String(-Number(this.buffer));
        this.updateDisplay();
        break;
      case "%":
        this.buffer = String(Number(this.buffer) / 100);
        this.updateDisplay();
        break;
      case ".":
        this.inputDecimal();
        break;
      case "+":
      case "−":
      case "×":
      case "÷":
        this.setOperator(label);
        break;
      case "=":
        this.evaluate();
        break;
      case "x²":
        this.buffer = String(Math.pow(Number(this.buffer), 2));
        this.updateDisplay();
        break;
      case "x³":
        this.buffer = String(Math.pow(Number(this.buffer), 3));
        this.updateDisplay();
        break;
      case "√x":
        this.buffer = String(Math.sqrt(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "∛x":
        this.buffer = String(Math.cbrt(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "sin":
        this.buffer = String(Math.sin(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "cos":
        this.buffer = String(Math.cos(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "tan":
        this.buffer = String(Math.tan(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "ln":
        this.buffer = String(Math.log(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "log₁₀":
        this.buffer = String(Math.log10(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "1/x":
        this.buffer = String(1 / Number(this.buffer));
        this.updateDisplay();
        break;
      case "Rand":
        this.buffer = String(Math.random());
        this.updateDisplay();
        break;
      case "π":
        this.buffer = String(Math.PI);
        this.updateDisplay();
        break;
      case "EE":
        this.buffer += "e";
        this.updateDisplay();
        break;
      case "mr":
        this.buffer = String(this.memory);
        this.updateDisplay();
        break;
      case "m+":
        this.memory += Number(this.buffer);
        break;
      case "m−":
        this.memory -= Number(this.buffer);
        break;
      case "mc":
        this.memory = 0;
        break;
      case "2nd":
        this.toggleSecondFunctions();
        break;
      case "xʸ":
        this.pendingSciOperation = "pow";
        this.storeOperand();
        break;
      case "y√x":
        this.pendingSciOperation = "root";
        this.storeOperand();
        break;
      case "exp":
        this.buffer = String(Math.exp(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "eˣ":
        this.buffer = String(Math.exp(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "10ˣ":
        this.buffer = String(Math.pow(10, Number(this.buffer)));
        this.updateDisplay();
        break;
      case "sinh":
        this.buffer = String(Math.sinh(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "cosh":
        this.buffer = String(Math.cosh(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "tanh":
        this.buffer = String(Math.tanh(Number(this.buffer)));
        this.updateDisplay();
        break;
      case "x!":
        this.buffer = String(this.factorial(Number(this.buffer)));
        this.updateDisplay();
        break;
      default:
        break;
    }
  }

  toggleSecondFunctions() {
    this.secondFunctions = !this.secondFunctions;
  }

  inputDigit(digit) {
    if (this.buffer === "0" || this.replaceOnNext) {
      this.buffer = digit;
      this.replaceOnNext = false;
    } else {
      this.buffer += digit;
    }
    this.updateDisplay();
  }

  inputDecimal() {
    if (!this.buffer.includes(".")) {
      this.buffer += ".";
      this.updateDisplay();
    }
  }

  setOperator(operator) {
    if (this.operator) {
      this.evaluate();
    } else {
      this.operands.push(Number(this.buffer));
    }
    this.operator = operator;
    this.replaceOnNext = true;
  }

  evaluate() {
    const current = Number(this.buffer);
    let result = current;
    if (this.pendingSciOperation && this.operands.length) {
      const stored = this.operands.pop();
      if (this.pendingSciOperation === "pow") {
        result = Math.pow(stored, current);
      }
      if (this.pendingSciOperation === "root") {
        result = Math.pow(stored, 1 / current);
      }
      this.pendingSciOperation = null;
    } else if (this.operator && this.operands.length) {
      const previous = this.operands.pop();
      switch (this.operator) {
        case "+":
          result = previous + current;
          break;
        case "−":
          result = previous - current;
          break;
        case "×":
          result = previous * current;
          break;
        case "÷":
          result = current === 0 ? "Error" : previous / current;
          break;
        default:
          result = current;
          break;
      }
    }
    this.buffer = String(result);
    this.operator = null;
    this.operands = [];
    this.replaceOnNext = true;
    this.updateDisplay();
  }

  storeOperand() {
    this.operands = [Number(this.buffer)];
    this.replaceOnNext = true;
  }

  reset() {
    this.buffer = "0";
    this.operator = null;
    this.operands = [];
    this.updateDisplay();
  }

  updateDisplay() {
    this.display.textContent = this.buffer;
  }

  factorial(value) {
    if (value < 0 || !Number.isInteger(value)) return NaN;
    let result = 1;
    for (let i = 2; i <= value; i += 1) {
      result *= i;
    }
    return result;
  }

  destroy() {
    window.removeEventListener("keydown", this.keyHandler);
    this.eventBusSubscription?.();
    this.copySubscription?.();
    this.pasteSubscription?.();
  }
}
