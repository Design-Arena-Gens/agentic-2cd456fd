class AppRegistryInstance {
  constructor() {
    this.apps = new Map();
  }

  register(app) {
    this.apps.set(app.id, app);
  }

  get(appId) {
    return this.apps.get(appId);
  }

  getAppById(windowId) {
    const [appId] = windowId.split("-");
    return this.get(appId);
  }

  list() {
    return Array.from(this.apps.values());
  }
}

export const AppRegistry = new AppRegistryInstance();
window.AppRegistry = AppRegistry;
