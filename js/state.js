const STORAGE_KEY = "macos-webos-state";

export class SystemState {
  constructor() {
    this.state = this.load();
    window.addEventListener("beforeunload", () => this.persist());
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          windows: parsed.windows ?? {},
          preferences: parsed.preferences ?? this.defaultPreferences(),
          files: parsed.files ?? null,
        };
      }
    } catch (error) {
      console.warn("Failed to load state", error);
    }
    return {
      windows: {},
      preferences: this.defaultPreferences(),
      files: null,
    };
  }

  defaultPreferences() {
    return {
      accentColor: "blue",
      autoHideDock: false,
      desktopBackground: "default",
      showRecentApps: true,
    };
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn("Failed to persist state", error);
    }
  }

  setWindowState(id, data) {
    this.state.windows[id] = { ...(this.state.windows[id] ?? {}), ...data, updated: Date.now() };
    this.persist();
  }

  getWindowState(id) {
    return this.state.windows[id] ?? null;
  }

  updatePreferences(partial) {
    this.state.preferences = { ...this.state.preferences, ...partial };
    this.persist();
  }

  getPreferences() {
    return this.state.preferences;
  }

  setVirtualFiles(fileState) {
    this.state.files = fileState;
    this.persist();
  }

  getVirtualFiles() {
    return this.state.files;
  }
}
