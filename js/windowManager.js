import { createElement } from "./utils.js";

const DEFAULT_BOUNDS = {
  width: 720,
  height: 520,
  x: 120,
  y: 120,
};

export class WindowManager {
  constructor({ layer, eventBus, state, fileSystem }) {
    this.layer = layer;
    this.eventBus = eventBus;
    this.state = state;
    this.fileSystem = fileSystem;
    this.windows = new Map();
    this.zIndexCounter = 100;
    this.activeWindowId = null;
    this.registerEvents();
    this.restorePersistedWindows();
  }

  registerEvents() {
    this.eventBus.subscribe("window:request-focus", (id) => this.focusWindow(id));
    this.eventBus.subscribe("window:close", (id) => this.closeWindow(id));
    this.eventBus.subscribe("window:minimize", (id) => this.minimizeWindow(id));
    this.eventBus.subscribe("window:maximize", (id) => this.toggleMaximize(id));
    this.eventBus.subscribe("window:update-title", ({ id, title }) => this.updateTitle(id, title));
    this.eventBus.subscribe("mission-control:toggle", () => this.toggleMissionControl());
    this.eventBus.subscribe("window:cycle", () => this.cycleWindows());
  }

  restorePersistedWindows() {
    const states = this.state.state.windows;
    Object.entries(states).forEach(([id, winState]) => {
      if (!winState.persist) return;
      const app = window.AppRegistry?.getAppById(id);
      if (!app) return;
      delete this.state.state.windows[id];
      this.createWindow(app, { restored: true, winState });
    });
  }

  createWindow(app, { restored = false, winState = null } = {}) {
    const windowId = `${app.id}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const element = createElement("div", { class: "window", dataset: { windowId } });
    const header = this.renderHeader(app, windowId);
    const content = createElement("div", { class: "window-content" });
    const resizer = createElement("div", { class: "window-resizer corner bottom-right" });
    const edgeTop = createElement("div", { class: "window-resize-handle edge-top" });
    const edgeBottom = createElement("div", { class: "window-resize-handle edge-bottom" });
    const edgeLeft = createElement("div", { class: "window-resize-handle edge-left" });
    const edgeRight = createElement("div", { class: "window-resize-handle edge-right" });
    element.append(header, content, resizer, edgeTop, edgeBottom, edgeLeft, edgeRight);
    this.layer.appendChild(element);

    const bounds = this.restoreBounds(winState) ?? this.nextBounds();
    this.applyBounds(element, bounds);
    this.attachWindowBehavior({
      element,
      header,
      resizer,
      edgeHandles: { edgeTop, edgeBottom, edgeLeft, edgeRight },
      app,
      windowId,
    });
    const instance = app.createInstance(content, windowId, {
      eventBus: this.eventBus,
      state: this.state,
      fileSystem: this.fileSystem,
    });

    this.windows.set(windowId, {
      id: windowId,
      app,
      element,
      header,
      content,
      resizer,
      instance,
      minimized: false,
      maximized: false,
      persist: app.persist ?? false,
    });
    this.state.setWindowState(windowId, { ...bounds, persist: this.windows.get(windowId).persist });
    this.focusWindow(windowId);
    this.eventBus.publish("dock:activate", app.id);
    this.eventBus.publish("menu:update", { appId: app.id, menu: app.menuDefinition ?? null });
    return windowId;
  }

  renderHeader(app, windowId) {
    const header = createElement("div", { class: "window-header", draggable: "false" });
    const traffic = createElement("div", { class: "traffic-lights" });
    const close = createElement("button", { class: "traffic-light close", dataset: { action: "close", windowId } });
    const minimize = createElement("button", { class: "traffic-light minimize", dataset: { action: "minimize", windowId } });
    const maximize = createElement("button", { class: "traffic-light maximize", dataset: { action: "maximize", windowId } });
    const title = createElement("div", { class: "window-title", text: app.title });
    traffic.append(close, minimize, maximize);
    header.append(traffic, title);
    return header;
  }

  restoreBounds(winState) {
    if (!winState) return null;
    if (typeof winState.x !== "number" || typeof winState.y !== "number") return null;
    return {
      width: winState.width ?? DEFAULT_BOUNDS.width,
      height: winState.height ?? DEFAULT_BOUNDS.height,
      x: winState.x,
      y: winState.y,
    };
  }

  nextBounds() {
    const offset = (this.windows.size % 5) * 32;
    return {
      width: DEFAULT_BOUNDS.width,
      height: DEFAULT_BOUNDS.height,
      x: DEFAULT_BOUNDS.x + offset,
      y: DEFAULT_BOUNDS.y + offset,
    };
  }

  applyBounds(element, { width, height, x, y }) {
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.transform = `translate(${x}px, ${y}px)`;
  }

  attachWindowBehavior({ element, header, resizer, edgeHandles, app, windowId }) {
    let isDragging = false;
    let dragStart = null;
    let initialBounds = null;

    const onPointerMove = (event) => {
      if (!isDragging) return;
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      const nextX = initialBounds.x + dx;
      const nextY = initialBounds.y + dy;
      this.applyBounds(element, { ...initialBounds, x: nextX, y: nextY });
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      this.persistBounds(windowId);
    };

    header.addEventListener("pointerdown", (event) => {
      if ((event.target?.dataset?.action ?? "") !== "") return;
      isDragging = true;
      dragStart = { x: event.clientX, y: event.clientY };
      initialBounds = this.readBounds(element);
      header.setPointerCapture(event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      this.focusWindow(windowId);
    });

    const startResize = (event, directions) => {
      event.stopPropagation();
      const resizeStart = { x: event.clientX, y: event.clientY };
      const bounds = this.readBounds(element);
      const onResize = (moveEvent) => {
        let { width, height, x, y } = bounds;
        const dx = moveEvent.clientX - resizeStart.x;
        const dy = moveEvent.clientY - resizeStart.y;
        if (directions.includes("right")) {
          width = Math.max(360, bounds.width + dx);
        }
        if (directions.includes("bottom")) {
          height = Math.max(260, bounds.height + dy);
        }
        if (directions.includes("left")) {
          width = Math.max(360, bounds.width - dx);
          x = bounds.x + dx;
        }
        if (directions.includes("top")) {
          height = Math.max(260, bounds.height - dy);
          y = bounds.y + dy;
        }
        this.applyBounds(element, { width, height, x, y });
      };
      const onResizeEnd = () => {
        window.removeEventListener("pointermove", onResize);
        window.removeEventListener("pointerup", onResizeEnd);
        this.persistBounds(windowId);
      };
      window.addEventListener("pointermove", onResize);
      window.addEventListener("pointerup", onResizeEnd);
    };

    resizer.addEventListener("pointerdown", (event) => startResize(event, ["right", "bottom"]));
    edgeHandles.edgeRight.addEventListener("pointerdown", (event) => startResize(event, ["right"]));
    edgeHandles.edgeLeft.addEventListener("pointerdown", (event) => startResize(event, ["left"]));
    edgeHandles.edgeTop.addEventListener("pointerdown", (event) => startResize(event, ["top"]));
    edgeHandles.edgeBottom.addEventListener("pointerdown", (event) => startResize(event, ["bottom"]));

    header.addEventListener("dblclick", () => this.toggleMaximize(windowId));

    header.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      switch (action) {
        case "close":
          this.closeWindow(windowId);
          break;
        case "minimize":
          this.minimizeWindow(windowId);
          break;
        case "maximize":
          this.toggleMaximize(windowId);
          break;
        default:
          break;
      }
    });

    element.addEventListener("mousedown", () => this.focusWindow(windowId));

    this.eventBus.subscribe(`window:${windowId}:focus`, () => this.focusWindow(windowId));
    this.eventBus.subscribe(`window:${windowId}:request-close`, () => this.closeWindow(windowId));
    this.eventBus.subscribe(`window:${windowId}:set-title`, (title) => this.updateTitle(windowId, title));

    if (typeof app.onWindowCreated === "function") {
      app.onWindowCreated(windowId, element);
    }
  }

  readBounds(element) {
    const width = parseFloat(element.style.width);
    const height = parseFloat(element.style.height);
    const transform = element.style.transform;
    const matches = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
    const x = matches ? parseFloat(matches[1]) : 0;
    const y = matches ? parseFloat(matches[2]) : 0;
    return { width, height, x, y };
  }

  persistBounds(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    const bounds = this.readBounds(windowData.element);
    this.state.setWindowState(windowId, { ...bounds, maximized: windowData.maximized, persist: windowData.persist });
  }

  focusWindow(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    this.zIndexCounter += 1;
    windowData.element.style.zIndex = this.zIndexCounter;
    windowData.element.classList.remove("hidden");
    windowData.minimized = false;
    this.activeWindowId = windowId;
    this.eventBus.publish("dock:activate", windowData.app.id);
    this.eventBus.publish("menu:update", { appId: windowData.app.id, menu: windowData.app.menuDefinition ?? null });
  }

  closeWindow(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    windowData.instance?.destroy?.();
    windowData.element.remove();
    this.windows.delete(windowId);
    this.state.setWindowState(windowId, { persist: false });
    const hasSameApp = Array.from(this.windows.values()).some((win) => win.app.id === windowData.app.id);
    if (!hasSameApp) {
      this.eventBus.publish("dock:deactivate", windowData.app.id);
    }
    if (this.activeWindowId === windowId) {
      const next = Array.from(this.windows.keys()).pop() ?? null;
      if (next) {
        this.focusWindow(next);
      } else {
        this.activeWindowId = null;
        this.eventBus.publish("menu:update", { appId: null, menu: null });
      }
    }
  }

  minimizeWindow(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    windowData.element.classList.add("hidden");
    windowData.minimized = true;
    if (this.activeWindowId === windowId) {
      this.activeWindowId = null;
    }
    this.state.setWindowState(windowId, { minimized: true, persist: windowData.persist });
  }

  toggleMaximize(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    const maximized = !windowData.maximized;
    windowData.maximized = maximized;
    if (maximized) {
      windowData.element.classList.add("maximized");
      windowData.element.style.transform = `translate(0px, ${parseFloat(getComputedStyle(this.layer).paddingTop ?? "0")}px)`;
      windowData.element.style.width = `${this.layer.clientWidth}px`;
      windowData.element.style.height = `${this.layer.clientHeight}px`;
    } else {
      const bounds = this.state.getWindowState(windowId) ?? this.nextBounds();
      this.applyBounds(windowData.element, bounds);
      windowData.element.classList.remove("maximized");
    }
    this.persistBounds(windowId);
  }

  toggleMissionControl() {
    const overlay = document.getElementById("mission-control");
    if (!overlay) return;
    const active = !overlay.hasAttribute("hidden");
    if (active) {
      overlay.replaceChildren();
      overlay.setAttribute("hidden", "");
      this.eventBus.publish("menu:mission-control", { active: false });
      return;
    }
    overlay.removeAttribute("hidden");
    const entries = Array.from(this.windows.values()).map((win) => this.captureWindow(win));
    overlay.replaceChildren(...entries);
    this.eventBus.publish("menu:mission-control", { active: true });
  }

  captureWindow(win) {
    const snapshot = win.element.cloneNode(true);
    snapshot.querySelectorAll(".window-resizer, .window-resize-handle").forEach((node) => node.remove());
    snapshot.querySelectorAll(".traffic-light").forEach((node) => node.removeAttribute("data-action"));
    snapshot.style.transform = "scale(1)";
    snapshot.style.pointerEvents = "none";
    const container = createElement("div", {
      class: `mission-window${this.activeWindowId === win.id ? " active" : ""}`,
      dataset: { windowId: win.id },
    });
    container.appendChild(snapshot);
    const label = createElement("div", { class: "mission-window-label" });
    label.textContent = `${win.app.title}`;
    container.appendChild(label);
    container.addEventListener("click", () => {
      this.toggleMissionControl();
      this.focusWindow(win.id);
    });
    return container;
  }

  updateTitle(windowId, title) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;
    windowData.header.querySelector(".window-title").textContent = title;
  }

  listWindows() {
    return Array.from(this.windows.values()).map((win) => ({
      id: win.id,
      appId: win.app.id,
      title: win.app.title,
      minimized: win.minimized,
      maximized: win.maximized,
    }));
  }

  cycleWindows() {
    const ids = Array.from(this.windows.keys());
    if (!ids.length) return;
    const currentIndex = ids.indexOf(this.activeWindowId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % ids.length;
    this.focusWindow(ids[nextIndex]);
  }
}
