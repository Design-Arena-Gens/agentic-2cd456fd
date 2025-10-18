import { createElement } from "../js/utils.js";

const ACCENT_OPTIONS = [
  { label: "Blue", value: "blue", color: "#0a84ff" },
  { label: "Purple", value: "purple", color: "#bf5af2" },
  { label: "Pink", value: "pink", color: "#ff375f" },
  { label: "Red", value: "red", color: "#ff453a" },
  { label: "Orange", value: "orange", color: "#ff9f0a" },
  { label: "Yellow", value: "yellow", color: "#ffd60a" },
  { label: "Green", value: "green", color: "#32d74b" },
  { label: "Graphite", value: "graphite", color: "#8e8e93" }
];

export const SystemPreferencesApp = {
  id: "settings",
  title: "System Preferences",
  icon: "images/settings.svg",
  persist: true,
  menuDefinition: [
    {
      id: "preferences-menu",
      label: "System Preferences",
      items: [
        { label: "About System Preferences", action: "system:about" },
        { divider: true },
        { label: "Quit System Preferences", action: "window:close-active", shortcut: "⌘Q" }
      ]
    }
  ],
  createInstance(container, windowId, { eventBus, state }) {
    const instance = new SystemPreferencesInstance(container, windowId, eventBus, state);
    return { destroy: () => instance.destroy() };
  }
};

class SystemPreferencesInstance {
  constructor(container, windowId, eventBus, state) {
    this.container = container;
    this.windowId = windowId;
    this.eventBus = eventBus;
    this.state = state;
    this.preferences = { ...state.getPreferences() };
    this.currentSection = "General";
    this.build();
    this.renderContent();
  }

  build() {
    this.container.innerHTML = "";
    this.wrapper = createElement("div", { class: "system-preferences" });
    this.nav = createElement("div", { class: "system-preferences-nav" });
    this.content = createElement("div", { class: "system-preferences-content" });
    const sections = ["General", "Dock & Menu Bar", "Desktop", "About"];
    sections.forEach((section) => {
      const button = createElement("button", { text: section });
      button.style.display = "block";
      button.style.width = "100%";
      button.style.textAlign = "left";
      button.style.padding = "8px 10px";
      button.style.borderRadius = "8px";
      button.addEventListener("click", () => {
        this.currentSection = section;
        this.renderContent();
      });
      this.nav.appendChild(button);
    });
    this.wrapper.append(this.nav, this.content);
    this.container.appendChild(this.wrapper);
  }

  renderContent() {
    this.content.innerHTML = "";
    switch (this.currentSection) {
      case "General":
        this.renderGeneral();
        break;
      case "Dock & Menu Bar":
        this.renderDock();
        break;
      case "Desktop":
        this.renderDesktop();
        break;
      case "About":
        this.renderAbout();
        break;
      default:
        break;
    }
  }

  renderGeneral() {
    const section = createElement("div");
    section.innerHTML = `<h2>Accent color</h2>`;
    const palette = createElement("div");
    palette.style.display = "grid";
    palette.style.gridTemplateColumns = "repeat(4, 1fr)";
    palette.style.gap = "12px";
    ACCENT_OPTIONS.forEach((option) => {
      const chip = createElement("button");
      chip.style.border = "none";
      chip.style.height = "48px";
      chip.style.borderRadius = "12px";
      chip.style.background = option.color;
      chip.style.boxShadow = option.value === this.preferences.accentColor ? "0 0 0 4px rgba(255,255,255,0.8)" : "none";
      chip.addEventListener("click", () => {
        this.preferences.accentColor = option.value;
        this.persist();
        this.renderContent();
        this.eventBus.publish("preferences:updated", this.preferences);
      });
      palette.appendChild(chip);
    });
    section.appendChild(palette);
    this.content.appendChild(section);
  }

  renderDock() {
    const section = createElement("div");
    section.innerHTML = `<h2>Dock & Menu Bar</h2>`;
    section.appendChild(this.toggleRow("Automatically hide and show the Dock", "autoHideDock"));
    section.appendChild(this.toggleRow("Show recent applications in Dock", "showRecentApps"));
    this.content.appendChild(section);
  }

  renderDesktop() {
    const section = createElement("div");
    section.innerHTML = `<h2>Desktop Picture</h2>`;
    const select = createElement("select");
    ["default", "sunset", "graphite"].forEach((variant) => {
      const option = createElement("option", { text: variant.charAt(0).toUpperCase() + variant.slice(1) });
      option.value = variant;
      if (variant === this.preferences.desktopBackground) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      this.preferences.desktopBackground = select.value;
      this.persist();
      this.eventBus.publish("preferences:updated", this.preferences);
    });
    section.appendChild(select);
    this.content.appendChild(section);
  }

  renderAbout() {
    const section = createElement("div");
    section.innerHTML = `
      <h2>macOS WebOS</h2>
      <p>Version 1.0</p>
      <p>© ${new Date().getFullYear()} WebOS Labs</p>
    `;
    this.content.appendChild(section);
  }

  toggleRow(label, key) {
    const row = createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "12px 0";
    const text = createElement("span", { text: label });
    const toggle = createElement("button", { class: "toggle" });
    if (this.preferences[key]) toggle.classList.add("active");
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("active");
      this.preferences[key] = toggle.classList.contains("active");
      this.persist();
      this.eventBus.publish("preferences:updated", this.preferences);
    });
    row.append(text, toggle);
    return row;
  }

  persist() {
    this.state.updatePreferences(this.preferences);
  }

  destroy() {}
}
