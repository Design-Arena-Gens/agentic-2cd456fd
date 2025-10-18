import { createElement } from "./utils.js";

export class Notifications {
  constructor({ container }) {
    this.container = container;
  }

  push({ title, body, timeout = 4000 }) {
    const notification = createElement("div", { class: "notification" });
    const notifTitle = createElement("div", { class: "notification-title", text: title });
    const notifBody = createElement("div", { class: "notification-body", text: body });
    notification.append(notifTitle, notifBody);
    this.container.appendChild(notification);
    setTimeout(() => {
      notification.classList.add("closing");
      notification.addEventListener("transitionend", () => notification.remove(), { once: true });
    }, timeout);
  }
}
