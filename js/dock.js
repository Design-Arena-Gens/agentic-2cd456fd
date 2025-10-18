import { createElement, withTooltip } from "./utils.js";

export class Dock {
  constructor({ container, eventBus }) {
    this.container = container;
    this.eventBus = eventBus;
    this.items = new Map();
    this.build();
    this.registerEvents();
  }

  build() {
    this.container.innerHTML = "";
    this.itemElements = {};
    const apps = window.AppRegistry.list();
    apps.forEach((app) => this.addItem(app));
  }

  addItem(app) {
    const item = createElement("div", { class: "dock-item", dataset: { appId: app.id } });
    const button = createElement("button", { attrs: { type: "button", "aria-label": app.title } });
    const icon = createElement("img", { attrs: { src: app.icon, alt: `${app.title} icon` } });
    button.appendChild(icon);
    const indicator = createElement("div", { class: "indicator" });
    item.append(button, indicator);
    this.container.appendChild(item);
    this.itemElements[app.id] = item;
    withTooltip(button, app.title);
    button.addEventListener("click", () => {
      this.eventBus.publish("dock:launch", { appId: app.id });
      item.classList.add("bounce");
      setTimeout(() => item.classList.remove("bounce"), 1000);
    });
  }

  registerEvents() {
    this.eventBus.subscribe("dock:activate", (appId) => {
      const item = this.itemElements[appId];
      if (item) item.classList.add("active");
    });
    this.eventBus.subscribe("dock:deactivate", (appId) => {
      const item = this.itemElements[appId];
      if (item) item.classList.remove("active");
    });
  }
}
