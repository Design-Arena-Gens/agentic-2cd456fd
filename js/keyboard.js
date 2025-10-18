const KEY_ACTIONS = [
  { keys: ["Meta", " "], action: "mission-control:toggle" },
  { keys: ["Meta", ","], action: "system:preferences" },
  { keys: ["Meta", "Tab"], action: "window:cycle" }
];

export class KeyboardShortcuts {
  constructor({ eventBus }) {
    this.eventBus = eventBus;
    this.pressed = new Set();
    this.attach();
  }

  attach() {
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("keyup", (event) => this.handleKeyUp(event));
    window.addEventListener("blur", () => this.pressed.clear());
  }

  handleKeyDown(event) {
    if (event.repeat) return;
    this.pressed.add(event.key === "Meta" ? "Meta" : event.key);
    for (const mapping of KEY_ACTIONS) {
      if (mapping.keys.every((key) => this.pressed.has(key))) {
        event.preventDefault();
        this.eventBus.publish(mapping.action);
        break;
      }
    }
  }

  handleKeyUp(event) {
    this.pressed.delete(event.key === "Meta" ? "Meta" : event.key);
  }
}
