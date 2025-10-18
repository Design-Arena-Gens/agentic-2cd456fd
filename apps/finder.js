import { createElement, humanFileSize, formatDate } from "../js/utils.js";

export const FinderApp = {
  id: "finder",
  title: "Finder",
  icon: "images/finder.svg",
  persist: true,
  menuDefinition: [
    {
      id: "finder-menu",
      label: "Finder",
      items: [
        { label: "About Finder", action: "system:about" },
        { divider: true },
        { label: "Preferences...", disabled: true },
        { divider: true },
        { label: "Services", disabled: true },
        { divider: true },
        { label: "Hide Finder", disabled: true },
        { label: "Quit Finder", action: "window:close-active", shortcut: "⌘Q" }
      ]
    },
    {
      id: "view-menu",
      label: "View",
      items: [
        { label: "as Icons", action: "finder:view", payload: "icons" },
        { label: "as List", action: "finder:view", payload: "list" },
        { label: "as Columns", action: "finder:view", payload: "columns" }
      ]
    },
    {
      id: "go-menu",
      label: "Go",
      items: [
        { label: "Home", action: "finder:navigate", payload: ["Users", "Guest"] },
        { label: "Applications", action: "finder:navigate", payload: ["Applications"] },
        { label: "Documents", action: "finder:documents" }
      ]
    }
  ],
  createInstance(container, windowId, { eventBus, fileSystem }) {
    const instance = new FinderInstance(container, windowId, eventBus, fileSystem);
    return { destroy: () => instance.destroy() };
  }
};

class FinderInstance {
  constructor(container, windowId, eventBus, fileSystem) {
    this.container = container;
    this.windowId = windowId;
    this.eventBus = eventBus;
    this.fileSystem = fileSystem;
    this.path = [];
    this.viewMode = "columns";
    this.build();
    this.registerEvents();
    this.render();
  }

  build() {
    this.container.innerHTML = "";
    this.layout = createElement("div", { class: "finder-layout" });
    this.sidebar = createElement("div", { class: "finder-sidebar" });
    this.toolbar = createElement("div", { class: "finder-toolbar" });
    this.columnsArea = createElement("div", { class: "finder-columns" });
    this.columnsArea.dataset.viewMode = this.viewMode;
    this.preview = createElement("div", { class: "finder-preview" });
    this.toolbarButtons = this.buildToolbar();
    this.sidebarSections();
    this.layout.append(this.sidebar, this.toolbar, this.columnsArea, this.preview);
    this.container.appendChild(this.layout);
  }

  buildToolbar() {
    const breadcrumb = createElement("div");
    breadcrumb.className = "finder-breadcrumb";
    breadcrumb.style.display = "flex";
    breadcrumb.style.gap = "8px";
    const viewToggle = createElement("div");
    viewToggle.style.display = "flex";
    viewToggle.style.gap = "6px";
    ["icons", "list", "columns"].forEach((mode) => {
      const btn = createElement("button", { text: mode.charAt(0).toUpperCase() + mode.slice(1) });
      btn.addEventListener("click", () => this.setViewMode(mode));
      viewToggle.appendChild(btn);
    });
    this.toolbar.append(breadcrumb, viewToggle);
    return { breadcrumb, viewToggle };
  }

  sidebarSections() {
    this.sidebar.innerHTML = "";
    const sections = [
      {
        label: "Favorites",
        items: [
          { name: "Desktop", path: [] },
          { name: "Documents", action: () => this.eventBus.publish("finder:documents") },
          { name: "Applications", path: ["Applications"] }
        ]
      },
      {
        label: "Devices",
        items: [
          { name: "Macintosh HD", path: [] }
        ]
      },
      {
        label: "Tags",
        items: [
          { name: "Work", color: "#ff9500" },
          { name: "Personal", color: "#30d158" },
          { name: "Important", color: "#ff375f" }
        ]
      }
    ];
    sections.forEach((section) => {
      const header = createElement("h4", { text: section.label });
      header.style.margin = "12px 0 6px";
      header.style.fontSize = "12px";
      header.style.letterSpacing = "0.08em";
      header.style.textTransform = "uppercase";
      header.style.opacity = "0.6";
      this.sidebar.appendChild(header);
      section.items.forEach((item) => {
        const entry = createElement("div", { class: "finder-item", text: item.name });
        entry.addEventListener("click", () => {
          if (item.action) {
            item.action();
          } else if (item.path) {
            this.path = item.path;
            this.render();
          }
        });
        if (item.color) {
          const tag = createElement("span", { class: "finder-tag" });
          tag.style.background = item.color;
          entry.appendChild(tag);
        }
        this.sidebar.appendChild(entry);
      });
    });
  }

  registerEvents() {
    this.subscriptions = [
      this.eventBus.subscribe("finder:view", (mode) => this.setViewMode(typeof mode === "string" ? mode : mode?.payload)),
      this.eventBus.subscribe("finder:navigate", (payload) => {
        this.path = Array.isArray(payload) ? payload : [];
        this.render();
      }),
      this.eventBus.subscribe("finder:documents", () => {
        this.previewDocuments();
      })
    ];
  }

  render() {
    this.renderBreadcrumb();
    this.renderColumns();
  }

  renderBreadcrumb() {
    const { breadcrumb } = this.toolbarButtons;
    breadcrumb.innerHTML = "";
    const segments = ["Macintosh HD", ...this.path];
    segments.forEach((segment, index) => {
      const button = createElement("button", { text: segment });
      button.addEventListener("click", () => {
        this.path = this.path.slice(0, index);
        this.render();
      });
      breadcrumb.appendChild(button);
      if (index < segments.length - 1) {
        breadcrumb.appendChild(createElement("span", { text: "›" }));
      }
    });
  }

  renderColumns() {
    this.columnsArea.innerHTML = "";
    if (this.viewMode === "columns") {
      const pathSlices = [[], ...this.path.map((_, index) => this.path.slice(0, index + 1))];
      pathSlices.forEach((segments) => {
        const column = createElement("div", { class: "finder-column" });
        const listing = this.fileSystem.listDirectory(segments);
        if (!listing) return;
        listing.directories.forEach((dir) => {
          const item = this.createColumnItem(dir, segments, true);
          column.appendChild(item);
        });
        listing.files.forEach((file) => {
          const item = this.createColumnItem(file.name, segments, false, file);
          column.appendChild(item);
        });
        this.columnsArea.appendChild(column);
      });
    } else {
      const listing = this.fileSystem.listDirectory(this.path) ?? { directories: [], files: [] };
      const column = createElement("div", { class: "finder-column" });
      listing.directories.forEach((dir) => {
        const item = this.createColumnItem(dir, this.path, true);
        column.appendChild(item);
      });
      listing.files.forEach((file) => {
        const item = this.createColumnItem(file.name, this.path, false, file);
        column.appendChild(item);
      });
      this.columnsArea.appendChild(column);
    }
  }

  createColumnItem(name, segments, isDirectory, metadata = {}) {
    const item = createElement("div", { class: "finder-item", text: name });
    const currentPath = [...segments, name];
    const isSelected = JSON.stringify(currentPath.slice(0, this.path.length)) === JSON.stringify(this.path);
    if (isSelected || (!this.path.length && segments.length === 0)) {
      item.classList.add("selected");
    }
    item.addEventListener("click", () => {
      if (isDirectory) {
        this.path = currentPath;
        this.render();
      } else {
        this.showPreview({ name, metadata });
      }
    });
    item.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.openContextMenu(event.clientX, event.clientY, { name, isDirectory, path: currentPath, metadata });
    });
    return item;
  }

  showPreview({ name, metadata }) {
    this.preview.innerHTML = "";
    const title = createElement("h3", { text: name });
    const info = createElement("div");
    info.innerHTML = `
      <p>Type: ${metadata.type ?? "Document"}</p>
      <p>Size: ${humanFileSize(metadata.size ?? 4096)}</p>
      <p>Modified: ${formatDate(new Date(metadata.updated ?? Date.now()))}</p>
    `;
    this.preview.append(title, info);
  }

  previewDocuments() {
    this.preview.innerHTML = "";
    const docs = this.fileSystem.listDocuments();
    if (!docs.length) {
      this.preview.textContent = "No TextEdit documents saved.";
      return;
    }
    docs.forEach((doc) => {
      const card = createElement("div");
      card.style.padding = "12px";
      card.style.borderRadius = "12px";
      card.style.background = "rgba(255,255,255,0.65)";
      card.style.marginBottom = "12px";
      const title = createElement("h4", { text: doc.name });
      title.style.margin = "0 0 6px";
      const snippet = createElement("div");
      snippet.style.fontSize = "13px";
      snippet.style.opacity = "0.7";
      snippet.innerHTML = doc.content.slice(0, 120);
      card.append(title, snippet);
      this.preview.appendChild(card);
    });
  }

  setViewMode(mode) {
    if (!mode) return;
    this.viewMode = mode;
    this.columnsArea.dataset.viewMode = mode;
    Array.from(this.toolbarButtons.viewToggle.children).forEach((button) => {
      button.classList.toggle("active", button.textContent.toLowerCase() === mode);
    });
    this.renderColumns();
  }

  openContextMenu(x, y, item) {
    const menu = document.querySelector(".context-menu");
    menu.innerHTML = "";
    const actions = [
      { label: "Open", action: () => (item.isDirectory ? (this.path = item.path, this.render()) : this.showPreview(item)) },
      { label: "Quick Look", action: () => this.quickLook(item) },
      { label: "Get Info", action: () => this.showInfo(item) },
      { divider: true },
      { label: "Rename", disabled: !item.isDirectory },
      { label: "Move to Trash", disabled: true }
    ];
    actions.forEach((action) => {
      if (action.divider) {
        menu.appendChild(createElement("div", { class: "menu-divider" }));
        return;
      }
      const button = createElement("button", { text: action.label });
      if (action.disabled) button.disabled = true;
      button.addEventListener("click", () => {
        action.action?.();
        menu.classList.remove("visible");
      });
      menu.appendChild(button);
    });
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add("visible");
  }

  quickLook(item) {
    const overlay = createElement("div", { class: "dialog-overlay" });
    const dialog = createElement("div", { class: "dialog" });
    dialog.style.width = "520px";
    dialog.style.minHeight = "240px";
    const title = createElement("h2", { text: item.name });
    const body = createElement("div");
    body.textContent = item.metadata?.type ?? "Document Preview";
    dialog.append(title, body);
    const close = createElement("button", { text: "Close" });
    close.addEventListener("click", () => overlay.remove());
    dialog.appendChild(close);
    overlay.appendChild(dialog);
    document.getElementById("dialogs").appendChild(overlay);
  }

  showInfo(item) {
    const overlay = createElement("div", { class: "dialog-overlay" });
    const dialog = createElement("div", { class: "dialog" });
    const title = createElement("h2", { text: `${item.name} Info` });
    const body = createElement("div");
    body.innerHTML = `
      <p>Kind: ${item.isDirectory ? "Folder" : (item.metadata?.type ?? "Document")}</p>
      <p>Path: /${item.path.join("/")}</p>
      <p>Size: ${humanFileSize(item.metadata?.size ?? 4096)}</p>
      <p>Created: ${formatDate(new Date())}</p>
    `;
    const close = createElement("button", { text: "Close" });
    close.addEventListener("click", () => overlay.remove());
    dialog.append(title, body, close);
    overlay.appendChild(dialog);
    document.getElementById("dialogs").appendChild(overlay);
  }

  destroy() {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
  }
}
