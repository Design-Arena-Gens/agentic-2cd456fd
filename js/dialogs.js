import { createElement } from "./utils.js";

export class Dialogs {
  constructor({ container, eventBus }) {
    this.container = container;
    this.eventBus = eventBus;
    this.registerEvents();
  }

  registerEvents() {
    this.eventBus.subscribe("system:about", () => this.showAbout());
  }

  showDialog({ title, content, buttons = [{ label: "OK", action: () => this.closeDialog() }] }) {
    this.container.innerHTML = "";
    const overlay = createElement("div", { class: "dialog-overlay" });
    const dialog = createElement("div", { class: "dialog" });
    const heading = createElement("h2", { text: title });
    const body = createElement("div");
    if (typeof content === "string") {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }
    dialog.append(heading, body);
    buttons.forEach((button) => {
      const btn = createElement("button", { text: button.label });
      btn.addEventListener("click", () => {
        button.action?.();
        this.closeDialog();
      });
      dialog.appendChild(btn);
    });
    overlay.appendChild(dialog);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        this.closeDialog();
      }
    });
    this.container.appendChild(overlay);
  }

  closeDialog() {
    this.container.innerHTML = "";
  }

  showAbout() {
    const content = `
      <p>macOS WebOS recreates the macOS desktop experience using vanilla web technologies.</p>
      <p style="font-size:13px; opacity:0.66;">Version 1.0 (Build ${new Date().getFullYear()})</p>
    `;
    this.showDialog({ title: "About This WebOS", content });
  }
}
