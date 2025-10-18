import { createElement, formatDate } from "../js/utils.js";

const COMMANDS = {
  help: "Available commands: help, clear, date, ls, pwd, whoami, open <app>, echo, cat <file>, defaults read.",
  whoami: "guest",
  pwd: "~",
};

export const TerminalApp = {
  id: "terminal",
  title: "Terminal",
  icon: "images/terminal.svg",
  persist: true,
  menuDefinition: [
    {
      id: "terminal-menu",
      label: "Terminal",
      items: [
        { label: "About Terminal", action: "system:about" },
        { divider: true },
        { label: "Quit Terminal", action: "window:close-active", shortcut: "⌘Q" }
      ]
    }
  ],
  createInstance(container, windowId, { eventBus, fileSystem, state }) {
    const instance = new TerminalInstance(container, windowId, eventBus, fileSystem, state);
    return { destroy: () => instance.destroy() };
  }
};

class TerminalInstance {
  constructor(container, windowId, eventBus, fileSystem, state) {
    this.container = container;
    this.windowId = windowId;
    this.eventBus = eventBus;
    this.fileSystem = fileSystem;
    this.state = state;
    this.history = [];
    this.historyIndex = 0;
    this.cwd = ["~"];
    this.build();
    this.registerEvents();
  }

  build() {
    this.container.innerHTML = "";
    this.wrapper = createElement("div", { class: "terminal" });
    const header = createElement("div", { class: "terminal-header" });
    header.textContent = "Terminal — bash";
    this.screen = createElement("div", { class: "terminal-screen" });
    this.inputLine = createElement("div", { class: "terminal-input-line" });
    this.prompt = createElement("span");
    this.prompt.textContent = this.promptText();
    this.input = document.createElement("input");
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.inputLine.append(this.prompt, this.input);
    this.wrapper.append(header, this.screen, this.inputLine);
    this.container.appendChild(this.wrapper);
    this.input.focus();
  }

  promptText() {
    return `guest@macos-webos ${this.cwd.join("/") || "~"} %`;
  }

  registerEvents() {
    this.inputHandler = (event) => {
      if (event.key === "Enter") {
        const command = this.input.value.trim();
        this.executeCommand(command);
        this.input.value = "";
      } else if (event.key === "ArrowUp") {
        if (this.historyIndex > 0) {
          this.historyIndex -= 1;
          this.input.value = this.history[this.historyIndex];
        }
        event.preventDefault();
      } else if (event.key === "ArrowDown") {
        if (this.historyIndex < this.history.length) {
          this.historyIndex += 1;
          this.input.value = this.history[this.historyIndex] ?? "";
        }
        event.preventDefault();
      }
    };
    this.input.addEventListener("keydown", this.inputHandler);
    this.screenObserver = new MutationObserver(() => this.input.scrollIntoView({ block: "end" }));
    this.screenObserver.observe(this.screen, { childList: true });
  }

  executeCommand(command) {
    this.writeLine(`${this.promptText()} ${command}`);
    if (!command) return;
    this.history.push(command);
    this.historyIndex = this.history.length;
    const [base, ...args] = command.split(" ");
    switch (base) {
      case "help":
        this.writeLine(COMMANDS.help);
        break;
      case "clear":
        this.screen.innerHTML = "";
        break;
      case "date":
        this.writeLine(formatDate(new Date()));
        break;
      case "whoami":
        this.writeLine(COMMANDS.whoami);
        break;
      case "pwd":
        this.writeLine(this.cwd.join("/") || "/");
        break;
      case "ls":
        this.listDirectory();
        break;
      case "open":
        this.openApp(args[0]);
        break;
      case "echo":
        this.writeLine(args.join(" "));
        break;
      case "cat":
        this.catFile(args[0]);
        break;
      case "defaults":
        this.defaultsCommand(args);
        break;
      default:
        this.writeLine(`command not found: ${base}`);
        break;
    }
  }

  listDirectory() {
    const listing = this.fileSystem.listDirectory([]);
    this.writeLine(listing.directories.join("   "));
  }

  openApp(appId) {
    if (!appId) {
      this.writeLine("open: application name required");
      return;
    }
    this.eventBus.publish("dock:launch", { appId });
    this.writeLine(`Opening ${appId}.app`);
  }

  catFile(fileName) {
    if (!fileName) {
      this.writeLine("cat: missing file operand");
      return;
    }
    const doc = this.fileSystem.getDocument(fileName);
    if (!doc) {
      this.writeLine(`cat: ${fileName}: No such file or directory`);
      return;
    }
    this.writeLine(doc.content.replace(/<[^>]+>/g, ""));
  }

  defaultsCommand(args) {
    if (args[0] === "read") {
      this.writeLine(JSON.stringify(this.state.getPreferences(), null, 2));
    } else {
      this.writeLine("defaults: supported usage `defaults read`");
    }
  }

  writeLine(text) {
    const line = createElement("div");
    line.textContent = text;
    this.screen.appendChild(line);
    this.screen.scrollTop = this.screen.scrollHeight;
  }

  destroy() {
    this.input.removeEventListener("keydown", this.inputHandler);
    this.screenObserver.disconnect();
  }
}
