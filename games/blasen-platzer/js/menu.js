// Auswahl im Start-Panel: Spielart und (im Finde-Modus) Zahlen / Buchstaben / Beides.
// Die Wahl wird kurz in localStorage gemerkt.
const KEY_MODE = "meine-spiele:blasen-platzer:mode";
const KEY_KINDS = "meine-spiele:blasen-platzer:find-kinds";

const MODES = [
  { id: "pop", icon: "\u{1F388}", name: "Blasen platzen" },
  { id: "find", icon: "\u{1F524}", name: "Zahlen & Buchstaben" },
];
const KINDS = [
  { id: "numbers", icon: "123", name: "Zahlen" },
  { id: "letters", icon: "ABC", name: "Buchstaben" },
  { id: "both", icon: "A1", name: "Beides" },
];

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
  const modePicker = document.querySelector("#mode-picker");
  const kindPicker = document.querySelector("#kind-picker");
  const menu = {
    mode: load(KEY_MODE, MODES, "pop"),
    kinds: load(KEY_KINDS, KINDS, "both"),
    show(visible) {
      modePicker.classList.toggle("is-hidden", !visible);
      kindPicker.classList.toggle("is-hidden", !visible || menu.mode !== "find");
    },
  };

  buildChips(modePicker, MODES, (id) => {
    if (id === menu.mode) return;
    menu.mode = id;
    save(KEY_MODE, id);
    mark(modePicker, id);
    menu.show(true);
    onChange();
  });
  buildChips(kindPicker, KINDS, (id) => {
    if (id === menu.kinds) return;
    menu.kinds = id;
    save(KEY_KINDS, id);
    mark(kindPicker, id);
    onChange();
  });
  mark(modePicker, menu.mode);
  mark(kindPicker, menu.kinds);
  return menu;
}
