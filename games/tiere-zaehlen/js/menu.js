// Auswahl im Start-Panel: Aufgabenfolge (Plus / Minus / Beides) und Zahlenraum (bis 10 / bis 15).
// Die Wahl wird kurz in localStorage gemerkt.
import { COUNT, TASK_DEFAULT } from "./config.js";

const KEY_TASKS = "meine-spiele:tiere-zaehlen:tasks";
const KEY_RANGE = "meine-spiele:tiere-zaehlen:range";

const TASKS = [
  { id: "plus", icon: "➕", name: "Plus" },
  { id: "minus", icon: "➖", name: "Minus" },
  { id: "both", icon: "➕➖", name: "Beides" },
];
const RANGES = COUNT.ranges.map((n) => ({ id: String(n), icon: "\u{1F522}", name: `bis ${n}` }));

function load(key, options, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (options.some((o) => o.id === value)) return value;
  } catch {
    /* ohne Speicher gilt der Standard */
  }
  return fallback;
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Speichern ist optional */
  }
}

function buildChips(container, options, onPick) {
  container.textContent = "";
  for (const option of options) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "mode-chip";
    chip.dataset.id = option.id;
    const icon = document.createElement("span");
    icon.className = "mode-chip-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = option.icon;
    const name = document.createElement("span");
    name.textContent = option.name;
    chip.append(icon, name);
    chip.addEventListener("click", () => onPick(option.id));
    container.append(chip);
  }
}

function mark(container, id) {
  container.querySelectorAll(".mode-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.id === id);
    chip.setAttribute("aria-pressed", String(chip.dataset.id === id));
  });
}

export function createMenu({ onChange }) {
  const taskPicker = document.querySelector("#task-picker");
  const rangePicker = document.querySelector("#range-picker");
  const menu = {
    tasks: load(KEY_TASKS, TASKS, TASK_DEFAULT),
    max: Number(load(KEY_RANGE, RANGES, String(COUNT.defaultMax))),
    show(visible) {
      taskPicker.classList.toggle("is-hidden", !visible);
      rangePicker.classList.toggle("is-hidden", !visible);
    },
  };

  buildChips(taskPicker, TASKS, (id) => {
    if (id === menu.tasks) return;
    menu.tasks = id;
    save(KEY_TASKS, id);
    mark(taskPicker, id);
    onChange();
  });
  buildChips(rangePicker, RANGES, (id) => {
    if (Number(id) === menu.max) return;
    menu.max = Number(id);
    save(KEY_RANGE, id);
    mark(rangePicker, id);
    onChange();
  });
  mark(taskPicker, menu.tasks);
  mark(rangePicker, String(menu.max));
  return menu;
}
