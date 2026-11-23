// DOM helpers of the editor. Text always goes in through text nodes (append of a string), never innerHTML (CMS plan E-b rules).
export const h = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.flat().filter((child) => child != null && child !== false));
  return node;
};

export const time = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "");

export function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (node.hidden = true), 4000);
}
