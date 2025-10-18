export function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.class) {
    element.className = options.class;
  }
  if (options.text) {
    element.textContent = options.text;
  }
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => element.dataset[key] = value);
  }
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => element.setAttribute(key, value));
  }
  if (options.html) {
    element.innerHTML = options.html;
  }
  return element;
}

export function formatDate(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatter.format(date);
}

export function humanFileSize(bytes) {
  if (bytes === 0) return "0 bytes";
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function withTooltip(element, text) {
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.textContent = text;
  document.body.appendChild(tooltip);
  let timeout = null;
  const show = () => {
    clearTimeout(timeout);
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
    tooltip.classList.add("visible");
  };
  const hide = () => {
    timeout = setTimeout(() => tooltip.classList.remove("visible"), 80);
  };
  element.addEventListener("mouseenter", show);
  element.addEventListener("mouseleave", hide);
  element.addEventListener("focus", show);
  element.addEventListener("blur", hide);
  return () => {
    element.removeEventListener("mouseenter", show);
    element.removeEventListener("mouseleave", hide);
    tooltip.remove();
  };
}
