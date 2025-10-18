import { createElement } from "../js/utils.js";

const FONT_FAMILIES = [
  { label: "System", value: `"SF Pro Text",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif` },
  { label: "Serif", value: `Georgia,"Times New Roman",serif` },
  { label: "Monospaced", value: `"SF Mono","Menlo","Monaco",monospace` }
];

const FONT_SIZES = ["12", "14", "16", "18", "24", "32"];

export const NotepadApp = {
  id: "textedit",
  title: "TextEdit",
  icon: "images/textedit.svg",
  persist: true,
  menuDefinition: [
    {
      id: "textedit-menu",
      label: "TextEdit",
      items: [
        { label: "About TextEdit", action: "system:about" },
        { divider: true },
        { label: "Preferences...", disabled: true },
        { divider: true },
        { label: "Quit TextEdit", action: "window:close-active", shortcut: "⌘Q" }
      ]
    },
    {
      id: "file-menu",
      label: "File",
      items: [
        { label: "New", action: "textedit:new", shortcut: "⌘N" },
        { label: "Open...", action: "textedit:open", shortcut: "⌘O" },
        { label: "Save", action: "textedit:save", shortcut: "⌘S" },
        { label: "Save As...", action: "textedit:save-as", shortcut: "⇧⌘S" }
      ]
    },
    {
      id: "format-menu",
      label: "Format",
      items: [
        { label: "Bold", action: "textedit:bold", shortcut: "⌘B" },
        { label: "Italic", action: "textedit:italic", shortcut: "⌘I" },
        { label: "Underline", action: "textedit:underline", shortcut: "⌘U" },
        { divider: true },
        { label: "Align Left", action: "textedit:align", payload: "left" },
        { label: "Align Center", action: "textedit:align", payload: "center" },
        { label: "Align Right", action: "textedit:align", payload: "right" },
        { divider: true },
        { label: "System Font", action: "textedit:set-font", payload: FONT_FAMILIES[0].value },
        { label: "Serif Font", action: "textedit:set-font", payload: FONT_FAMILIES[1].value },
        { label: "Monospaced Font", action: "textedit:set-font", payload: FONT_FAMILIES[2].value }
      ]
    }
  ],
  createInstance(container, windowId, { eventBus, fileSystem }) {
    const instance = new NotepadInstance(container, windowId, eventBus, fileSystem);
    return {
      destroy: () => instance.destroy()
    };
  }
};

class NotepadInstance {
  constructor(container, windowId, eventBus, fileSystem) {
    this.container = container;
    this.windowId = windowId;
    this.eventBus = eventBus;
    this.fileSystem = fileSystem;
    this.documentName = "Untitled";
    this.build();
    this.registerEvents();
    this.updateTitle();
  }

  build() {
    this.container.innerHTML = "";
    this.container.classList.add("notepad");
    this.toolbar = createElement("div", { class: "notepad-toolbar" });
    this.fontSelect = createElement("select");
    FONT_FAMILIES.forEach((font) => {
      const option = createElement("option", { text: font.label });
      option.value = font.value;
      this.fontSelect.appendChild(option);
    });
    this.fontSelect.value = FONT_FAMILIES[0].value;

    this.sizeSelect = createElement("select");
    FONT_SIZES.forEach((size) => {
      const option = createElement("option", { text: `${size} pt` });
      option.value = size;
      this.sizeSelect.appendChild(option);
    });
    this.sizeSelect.value = "16";

    this.boldButton = createElement("button", { text: "B" });
    this.boldButton.style.fontWeight = "600";
    this.italicButton = createElement("button", { text: "I" });
    this.italicButton.style.fontStyle = "italic";
    this.underlineButton = createElement("button", { text: "U" });
    this.underlineButton.style.textDecoration = "underline";
    this.toolbar.append(this.fontSelect, this.sizeSelect, this.boldButton, this.italicButton, this.underlineButton);

    this.editor = createElement("div", { class: "notepad-editor" });
    this.editor.contentEditable = "true";
    this.editor.spellcheck = true;
    this.editor.innerHTML = "<p>Start typing…</p>";

    this.container.append(this.toolbar, this.editor);

    this.fontSelect.addEventListener("change", () => {
      document.execCommand("fontName", false, this.fontSelect.value);
    });
    this.sizeSelect.addEventListener("change", () => {
      document.execCommand("fontSize", false, "4");
      this.applyFontSize(this.sizeSelect.value);
    });
    this.boldButton.addEventListener("click", () => document.execCommand("bold"));
    this.italicButton.addEventListener("click", () => document.execCommand("italic"));
    this.underlineButton.addEventListener("click", () => document.execCommand("underline"));
  }

  applyFontSize(size) {
    this.editor.querySelectorAll("font[size='4']").forEach((node) => {
      node.removeAttribute("size");
      node.style.fontSize = `${size}px`;
      node.style.lineHeight = "1.6";
    });
  }

  registerEvents() {
    this.eventSubscriptions = [
      this.eventBus.subscribe("textedit:new", () => this.newDocument()),
      this.eventBus.subscribe("textedit:open", () => this.openDialog()),
      this.eventBus.subscribe("textedit:save", () => this.saveDocument()),
      this.eventBus.subscribe("textedit:save-as", () => this.saveAsDialog()),
      this.eventBus.subscribe("textedit:bold", () => document.execCommand("bold")),
      this.eventBus.subscribe("textedit:italic", () => document.execCommand("italic")),
      this.eventBus.subscribe("textedit:underline", () => document.execCommand("underline")),
      this.eventBus.subscribe("textedit:align", (align) => document.execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`)),
      this.eventBus.subscribe("textedit:set-font", (font) => document.execCommand("fontName", false, typeof font === "string" ? font : font?.payload ?? FONT_FAMILIES[0].value))
    ];

    this.keyHandler = (event) => {
      if (!event.metaKey) return;
      switch (event.key.toLowerCase()) {
        case "b":
          event.preventDefault();
          document.execCommand("bold");
          break;
        case "i":
          event.preventDefault();
          document.execCommand("italic");
          break;
        case "u":
          event.preventDefault();
          document.execCommand("underline");
          break;
        case "s":
          event.preventDefault();
          if (event.shiftKey) {
            this.saveAsDialog();
          } else {
            this.saveDocument();
          }
          break;
        case "o":
          event.preventDefault();
          this.openDialog();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  updateTitle() {
    this.eventBus.publish(`window:${this.windowId}:set-title`, `${this.documentName} — TextEdit`);
  }

  newDocument() {
    this.editor.innerHTML = "<p></p>";
    this.documentName = "Untitled";
    this.updateTitle();
  }

  openDialog() {
    const overlay = this.createDialogShell("Open");
    const list = createElement("div");
    const docs = this.fileSystem.listDocuments();
    if (!docs.length) {
      list.textContent = "No recent documents.";
    } else {
      docs.forEach((doc) => {
        const item = createElement("button", { text: doc.name });
        item.addEventListener("click", () => {
          this.loadDocument(doc);
          overlay.remove();
        });
        list.appendChild(item);
      });
    }
    overlay.querySelector(".dialog-body").appendChild(list);
    this.container.appendChild(overlay);
  }

  saveDocument() {
    if (this.documentName === "Untitled") {
      this.saveAsDialog();
      return;
    }
    const content = this.editor.innerHTML;
    this.fileSystem.saveDocument(this.documentName, content);
  }

  saveAsDialog() {
    const overlay = this.createDialogShell("Save As");
    const body = overlay.querySelector(".dialog-body");
    const input = createElement("input");
    input.type = "text";
    input.value = this.documentName === "Untitled" ? "" : this.documentName;
    const saveButton = overlay.querySelector(".primary");
    saveButton.disabled = true;
    input.addEventListener("input", () => {
      saveButton.disabled = input.value.trim().length === 0;
    });
    saveButton.addEventListener("click", () => {
      this.documentName = input.value.trim();
      this.fileSystem.saveDocument(this.documentName, this.editor.innerHTML);
      this.updateTitle();
      overlay.remove();
    });
    body.appendChild(input);
    this.container.appendChild(overlay);
    input.focus();
  }

  loadDocument(doc) {
    this.documentName = doc.name;
    this.editor.innerHTML = doc.content;
    this.updateTitle();
  }

  createDialogShell(title) {
    const overlay = createElement("div", { class: "dialog-overlay" });
    const dialog = createElement("div", { class: "dialog" });
    const heading = createElement("h2", { text: `${title} Document` });
    const body = createElement("div", { class: "dialog-body" });
    const buttons = createElement("div");
    buttons.style.display = "flex";
    buttons.style.justifyContent = "flex-end";
    buttons.style.gap = "12px";
    const cancel = createElement("button", { text: "Cancel" });
    cancel.addEventListener("click", () => overlay.remove());
    const confirm = createElement("button", { text: title });
    confirm.classList.add("primary");
    buttons.append(cancel, confirm);
    dialog.append(heading, body, buttons);
    overlay.appendChild(dialog);
    return overlay;
  }

  destroy() {
    window.removeEventListener("keydown", this.keyHandler);
    this.eventSubscriptions.forEach((unsubscribe) => unsubscribe());
  }
}
