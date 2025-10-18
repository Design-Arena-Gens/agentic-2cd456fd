import { createElement, formatDate } from "./utils.js";

const BASE_MENU = [
  {
    label: "Apple",
    id: "apple",
    items: [
      { label: "About This WebOS...", action: "system:about" },
      { divider: true },
      { label: "System Preferences...", action: "system:preferences", shortcut: "⌘," },
      { label: "Mission Control", action: "mission-control:toggle", shortcut: "F3" },
      { divider: true },
      { label: "Sleep", disabled: true },
      { label: "Restart...", disabled: true },
      { label: "Shut Down...", disabled: true },
      { divider: true },
      { label: "Log Out Guest...", disabled: true }
    ]
  }
];

export class MenuBar {
  constructor({ container, eventBus }) {
    this.container = container;
    this.eventBus = eventBus;
    this.activeMenu = null;
    this.customMenu = null;
    this.build();
    this.registerEvents();
    this.tickClock();
  }

  build() {
    this.container.innerHTML = "";
    const left = createElement("div", { class: "menu-left" });
    const center = createElement("div", { class: "menu-center" });
    const right = createElement("div", { class: "menu-right" });
    this.container.append(left, center, right);
    this.renderMenus(left, BASE_MENU);
    this.renderCustomMenu(center, []);
    this.renderStatus(right);
  }

  renderMenus(target, menus) {
    menus.forEach((menu) => {
      const item = createElement("button", {
        class: "menu-item",
        text: menu.label,
        dataset: { menuId: menu.id ?? menu.label.toLowerCase().replace(/\s+/g, "-") }
      });
      item.setAttribute("type", "button");
      const dropdown = this.buildDropdown(menu.items ?? []);
      item.appendChild(dropdown);
      item.addEventListener("mouseenter", () => this.openMenu(item));
      item.addEventListener("click", () => this.toggleMenu(item));
      target.appendChild(item);
    });
  }

  renderCustomMenu(target, menuDefinitions) {
    target.innerHTML = "";
    this.customButtons = [];
    menuDefinitions.forEach((menu) => {
      const item = createElement("button", {
        class: "menu-item",
        text: menu.label,
        dataset: { menuId: menu.id }
      });
      item.setAttribute("type", "button");
      const dropdown = this.buildDropdown(menu.items ?? []);
      item.appendChild(dropdown);
      item.addEventListener("mouseenter", () => this.openMenu(item));
      item.addEventListener("click", () => this.toggleMenu(item));
      target.appendChild(item);
      this.customButtons.push(item);
    });
  }

  buildDropdown(items) {
    const dropdown = createElement("div", { class: "menu-dropdown" });
    items.forEach((item) => {
      if (item.divider) {
        dropdown.appendChild(createElement("div", { class: "menu-divider" }));
        return;
      }
      const button = createElement("button", { text: item.label });
      if (item.shortcut) {
        const shortcut = createElement("span", { text: item.shortcut });
        button.appendChild(shortcut);
      }
      if (item.disabled) {
        button.disabled = true;
      } else if (item.action) {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.eventBus.publish(item.action, item.payload ?? null);
          this.closeMenus();
        });
      }
      dropdown.appendChild(button);
    });
    return dropdown;
  }

  renderStatus(target) {
    target.innerHTML = "";
    const wifi = createElement("span", { class: "menu-item", text: "Wi-Fi" });
    wifi.style.fontWeight = "500";
    const battery = createElement("span", { class: "menu-item", text: "100%" });
    const time = createElement("span", { class: "menu-item", text: this.formattedTime() });
    time.dataset.menuId = "status-time";
    target.append(wifi, battery, time);
    this.timeElement = time;
  }

  formattedTime() {
    return formatDate(new Date());
  }

  tickClock() {
    this.timeElement.textContent = this.formattedTime();
    setTimeout(() => this.tickClock(), 60000);
  }

  toggleMenu(item) {
    if (this.activeMenu === item) {
      this.closeMenus();
    } else {
      this.openMenu(item);
    }
  }

  openMenu(item) {
    if (this.activeMenu && this.activeMenu !== item) {
      this.activeMenu.classList.remove("active");
      this.activeMenu.querySelector(".menu-dropdown")?.classList.remove("visible");
    }
    this.activeMenu = item;
    item.classList.add("active");
    item.querySelector(".menu-dropdown")?.classList.add("visible");
  }

  closeMenus() {
    if (!this.activeMenu) return;
    this.activeMenu.classList.remove("active");
    this.activeMenu.querySelector(".menu-dropdown")?.classList.remove("visible");
    this.activeMenu = null;
  }

  registerEvents() {
    document.addEventListener("click", (event) => {
      if (!this.container.contains(event.target)) {
        this.closeMenus();
      }
    });
    this.eventBus.subscribe("menu:update", ({ menu }) => {
      this.customMenu = menu ?? [];
      this.renderCustomMenu(this.container.querySelector(".menu-center"), this.customMenu);
    });
    this.eventBus.subscribe("menu:mission-control", ({ active }) => {
      const missionItem = this.container.querySelector('[data-menu-id="mission-control"]');
      if (missionItem) {
        missionItem.classList.toggle("active", active);
      }
    });
  }
}
