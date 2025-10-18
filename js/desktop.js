import { createElement } from "./utils.js";

export class Desktop {
  constructor({ container, eventBus, state }) {
    this.container = container;
    this.eventBus = eventBus;
    this.state = state;
    this.contextMenu = null;
    this.backgroundVariant = this.state.getPreferences().desktopBackground ?? "default";
    this.setupBackground();
    this.setupContextMenu();
    this.eventBus.subscribe("preferences:updated", (prefs) => {
      if (prefs.desktopBackground && prefs.desktopBackground !== this.backgroundVariant) {
        this.backgroundVariant = prefs.desktopBackground;
        this.drawBackground();
      }
    });
  }

  setupBackground() {
    const canvas = document.getElementById("desktop-background");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    this.drawBackground();
    window.addEventListener("resize", () => this.drawBackground());
  }

  drawBackground() {
    if (!this.canvas || !this.ctx) return;
    const canvas = this.canvas;
    const ctx = this.ctx;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const palette = this.paletteForVariant(this.backgroundVariant);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(1, palette[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const bubbles = 6;
    for (let i = 0; i < bubbles; i += 1) {
      const radius = Math.random() * 250 + 120;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const color = palette[2];
      const bubble = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
      bubble.addColorStop(0, color);
      bubble.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bubble;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  paletteForVariant(variant) {
    switch (variant) {
      case "sunset":
        return ["#ff7e5f", "#feb47b", "rgba(255, 255, 255, 0.25)"];
      case "graphite":
        return ["#434343", "#000000", "rgba(180, 180, 180, 0.22)"];
      default:
        return ["#1e2a78", "#3d4fb5", "rgba(140, 90, 230, 0.25)"];
    }
  }

  setupContextMenu() {
    this.contextMenu = createElement("div", { class: "context-menu" });
    this.container.appendChild(this.contextMenu);
    this.container.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.openContextMenu(event.clientX, event.clientY);
    });
    window.addEventListener("click", () => this.closeContextMenu());
  }

  openContextMenu(x, y) {
    this.contextMenu.innerHTML = "";
    const entries = [
      { label: "Mission Control", action: "mission-control:toggle" },
      { label: "Change Desktop Background…", action: "system:preferences", payload: { section: "Desktop" } },
      { divider: true },
      { label: "New Finder Window", action: "dock:launch", payload: { appId: "finder" } }
    ];
    entries.forEach((entry) => {
      if (entry.divider) {
        this.contextMenu.appendChild(createElement("div", { class: "menu-divider" }));
      } else {
        const button = createElement("button", { text: entry.label });
        button.addEventListener("click", () => {
          this.eventBus.publish(entry.action, entry.payload ?? null);
          this.closeContextMenu();
        });
        this.contextMenu.appendChild(button);
      }
    });
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.classList.add("visible");
  }

  closeContextMenu() {
    this.contextMenu.classList.remove("visible");
  }
}
