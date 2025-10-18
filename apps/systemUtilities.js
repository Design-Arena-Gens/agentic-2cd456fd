import { createElement, formatDate } from "../js/utils.js";

const MOCK_PROCESSES = [
  { name: "WindowServer", cpu: 14.2, memory: 512 },
  { name: "Finder", cpu: 4.3, memory: 220 },
  { name: "TextEdit", cpu: 2.1, memory: 160 },
  { name: "Terminal", cpu: 1.8, memory: 132 },
  { name: "Dock", cpu: 1.2, memory: 110 }
];

export const SystemUtilitiesApp = {
  id: "utilities",
  title: "System Utilities",
  icon: "images/utilities.svg",
  persist: false,
  menuDefinition: [
    {
      id: "utilities-menu",
      label: "Utilities",
      items: [
        { label: "About System Utilities", action: "system:about" },
        { divider: true },
        { label: "Run Diagnostics", action: "utilities:diagnostics" }
      ]
    }
  ],
  createInstance(container, windowId, { eventBus }) {
    const instance = new SystemUtilitiesInstance(container, windowId, eventBus);
    return { destroy: () => instance.destroy() };
  }
};

class SystemUtilitiesInstance {
  constructor(container, windowId, eventBus) {
    this.container = container;
    this.windowId = windowId;
    this.eventBus = eventBus;
    this.build();
    this.registerEvents();
    this.refresh();
  }

  build() {
    this.container.innerHTML = "";
    this.wrapper = createElement("div");
    this.wrapper.style.display = "grid";
    this.wrapper.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    this.wrapper.style.gap = "18px";
    this.wrapper.style.padding = "24px";

    this.cpuCard = this.makeCard("CPU Usage");
    this.memoryCard = this.makeCard("Memory");
    this.storageCard = this.makeCard("Storage");
    this.wrapper.append(this.cpuCard, this.memoryCard, this.storageCard);

    this.chart = createElement("canvas");
    this.chart.width = 600;
    this.chart.height = 180;
    this.chart.style.gridColumn = "1 / -1";
    this.wrapper.appendChild(this.chart);

    this.table = this.buildProcessTable();
    this.wrapper.appendChild(this.table);
    this.container.appendChild(this.wrapper);
  }

  makeCard(title) {
    const card = createElement("div");
    card.style.background = "rgba(255,255,255,0.75)";
    card.style.backdropFilter = "blur(24px)";
    card.style.borderRadius = "16px";
    card.style.padding = "18px";
    card.style.boxShadow = "0 12px 22px rgba(0,0,0,0.12)";
    const heading = createElement("h3", { text: title });
    heading.style.marginTop = "0";
    heading.style.marginBottom = "12px";
    const value = createElement("div");
    value.style.fontSize = "28px";
    value.style.fontWeight = "600";
    value.style.letterSpacing = "-0.02em";
    value.style.color = "var(--color-accent)";
    const sub = createElement("div");
    sub.style.fontSize = "12px";
    sub.style.opacity = "0.65";
    card.append(heading, value, sub);
    card.dataset.valueId = title.toLowerCase().replace(/\s+/g, "-");
    card.valueNode = value;
    card.subNode = sub;
    return card;
  }

  buildProcessTable() {
    const container = createElement("div");
    container.style.gridColumn = "1 / -1";
    container.style.background = "rgba(255,255,255,0.75)";
    container.style.borderRadius = "16px";
    container.style.padding = "18px";
    container.style.boxShadow = "0 12px 22px rgba(0,0,0,0.12)";
    const title = createElement("h3", { text: "Processes" });
    title.style.marginTop = "0";
    const table = createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    const header = createElement("tr");
    ["Process", "CPU %", "Memory MB"].forEach((col) => {
      const th = createElement("th", { text: col });
      th.style.textAlign = col === "Process" ? "left" : "right";
      th.style.fontSize = "12px";
      th.style.opacity = "0.6";
      th.style.paddingBottom = "8px";
      header.appendChild(th);
    });
    const thead = createElement("thead");
    thead.appendChild(header);
    const tbody = createElement("tbody");
    table.append(thead, tbody);
    container.append(title, table);
    this.processBody = tbody;
    return container;
  }

  refresh() {
    this.updateStats();
    this.renderChart();
    this.renderProcesses();
    this.timeout = setTimeout(() => this.refresh(), 5000);
  }

  updateStats() {
    const cpuUsage = (Math.random() * 40 + 20).toFixed(1);
    const freeMemory = (Math.random() * 4 + 8).toFixed(1);
    const storageUsed = (Math.random() * 400 + 300).toFixed(0);
    this.cpuCard.valueNode.textContent = `${cpuUsage}%`;
    this.cpuCard.subNode.textContent = `Updated ${formatDate(new Date())}`;
    this.memoryCard.valueNode.textContent = `${freeMemory} GB`;
    this.memoryCard.subNode.textContent = "Memory Pressure: Normal";
    this.storageCard.valueNode.textContent = `${storageUsed} GB`;
    this.storageCard.subNode.textContent = "of 1 TB used";
  }

  renderChart() {
    const ctx = this.chart.getContext("2d");
    ctx.clearRect(0, 0, this.chart.width, this.chart.height);
    ctx.strokeStyle = "#0a84ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const points = Array.from({ length: 24 }, () => Math.random());
    points.forEach((value, index) => {
      const x = (index / (points.length - 1)) * this.chart.width;
      const y = this.chart.height - value * this.chart.height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  renderProcesses() {
    this.processBody.innerHTML = "";
    MOCK_PROCESSES.forEach((proc) => {
      const modifier = Math.random() * 2 - 1;
      const cpu = Math.max(proc.cpu + modifier, 0).toFixed(1);
      const memory = Math.max(proc.memory + modifier * 10, 20).toFixed(0);
      const row = createElement("tr");
      const nameCell = createElement("td", { text: proc.name });
      const cpuCell = createElement("td", { text: cpu });
      const memCell = createElement("td", { text: memory });
      [nameCell, cpuCell, memCell].forEach((cell, idx) => {
        cell.style.padding = "6px 0";
        cell.style.fontSize = "13px";
        cell.style.borderTop = "1px solid rgba(0,0,0,0.06)";
        if (idx > 0) cell.style.textAlign = "right";
      });
      row.append(nameCell, cpuCell, memCell);
      this.processBody.appendChild(row);
    });
  }

  registerEvents() {
    this.subscription = this.eventBus.subscribe("utilities:diagnostics", () => {
      this.eventBus.publish("system:notification", {
        title: "Diagnostics Complete",
        body: "No problems found."
      });
    });
  }

  destroy() {
    clearTimeout(this.timeout);
    this.subscription?.();
  }
}
