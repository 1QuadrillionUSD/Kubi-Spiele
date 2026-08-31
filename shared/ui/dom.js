export const $ = (selector, root = document) => root.querySelector(selector);

export function setText(selector, value, root = document) {
  const element = $(selector, root);
  if (element) element.textContent = String(value);
}
