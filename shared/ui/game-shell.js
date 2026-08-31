export function bindButton(selector, handler, root = document) {
  const button = root.querySelector(selector);
  if (!button) return;
  button.addEventListener("click", handler);
}
