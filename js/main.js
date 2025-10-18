import { EventBus } from "./eventBus.js";
import { SystemState } from "./state.js";
import { VirtualFileSystem } from "./fileSystem.js";
import { AppRegistry } from "./appRegistry.js";
import { WindowManager } from "./windowManager.js";
import { Dock } from "./dock.js";
import { MenuBar } from "./menuBar.js";
import { Desktop } from "./desktop.js";
import { Notifications } from "./notifications.js";
import { Dialogs } from "./dialogs.js";
import { KeyboardShortcuts } from "./keyboard.js";
import { CalculatorApp } from "../apps/calculator.js";
import { NotepadApp } from "../apps/notepad.js";
import { FinderApp } from "../apps/finder.js";
import { TerminalApp } from "../apps/terminal.js";
import { SystemPreferencesApp } from "../apps/systemPreferences.js";
import { SystemUtilitiesApp } from "../apps/systemUtilities.js";

const eventBus = new EventBus();
const state = new SystemState();
const fileSystem = new VirtualFileSystem(state);

AppRegistry.register(FinderApp);
AppRegistry.register(NotepadApp);
AppRegistry.register(CalculatorApp);
AppRegistry.register(TerminalApp);
AppRegistry.register(SystemPreferencesApp);
AppRegistry.register(SystemUtilitiesApp);

const windowLayer = document.getElementById("window-layer");
const dockContainer = document.getElementById("dock");
const menuBarContainer = document.getElementById("menu-bar");
const notificationContainer = document.getElementById("notifications");
const dialogContainer = document.getElementById("dialogs");

const desktop = new Desktop({ container: document.getElementById("desktop"), eventBus, state });
const menuBar = new MenuBar({ container: menuBarContainer, eventBus });
const dock = new Dock({ container: dockContainer, eventBus });
const notifications = new Notifications({ container: notificationContainer });
const dialogs = new Dialogs({ container: dialogContainer, eventBus });
const windowManager = new WindowManager({ layer: windowLayer, eventBus, state, fileSystem });
const keyboard = new KeyboardShortcuts({ eventBus });

const launchApp = (appId) => {
  const app = AppRegistry.get(appId);
  if (!app) return;
  const instances = windowManager.listWindows().filter((win) => win.appId === appId);
  const activeInstance = instances.find((win) => !win.minimized);
  if (activeInstance) {
    windowManager.focusWindow(activeInstance.id);
    return;
  }
  const minimized = instances.find((win) => win.minimized);
  if (minimized) {
    windowManager.focusWindow(minimized.id);
    return;
  }
  windowManager.createWindow(app);
  notifications.push({ title: app.title, body: "Launched" });
};

eventBus.subscribe("dock:launch", ({ appId }) => launchApp(appId));
eventBus.subscribe("system:preferences", () => launchApp("settings"));
eventBus.subscribe("window:close-active", () => {
  const active = windowManager.activeWindowId;
  if (active) {
    windowManager.closeWindow(active);
  }
});
eventBus.subscribe("preferences:updated", (preferences) => {
  state.updatePreferences(preferences);
  document.documentElement.style.setProperty("--color-accent", accentToColor(preferences.accentColor));
  dockContainer.classList.toggle("auto-hide", preferences.autoHideDock);
});
eventBus.subscribe("system:notification", (payload) => notifications.push(payload));

function accentToColor(accent) {
  const map = {
    blue: "#0a84ff",
    purple: "#bf5af2",
    pink: "#ff375f",
    red: "#ff453a",
    orange: "#ff9f0a",
    yellow: "#ffd60a",
    green: "#32d74b",
    graphite: "#8e8e93"
  };
  return map[accent] ?? "#0a84ff";
}

window.desktop = desktop;
window.menuBar = menuBar;
window.dock = dock;
window.windowManager = windowManager;
window.notifications = notifications;
window.dialogs = dialogs;
window.eventBus = eventBus;
window.systemState = state;
window.fileSystem = fileSystem;

const preferences = state.getPreferences();
document.documentElement.style.setProperty("--color-accent", accentToColor(preferences.accentColor));
if (preferences.autoHideDock) {
  dockContainer.classList.add("auto-hide");
}

document.addEventListener("keydown", (event) => {
  if (event.metaKey && event.code === "Space") {
    eventBus.publish("mission-control:toggle");
  }
});
