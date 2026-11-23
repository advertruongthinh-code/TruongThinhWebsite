// DOM helpers of the editor. Text always goes in through text nodes (append of a string), never innerHTML (CMS plan E-b rules).
export const h = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.flat().filter((child) => child != null && child !== false));
  return node;
};

const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const CLOCK = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
// "23/11/2026 22:47"
export const time = (iso) => (iso ? `${DATE.format(new Date(iso))} ${CLOCK.format(new Date(iso))}` : "");

export function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (node.hidden = true), 4000);
}
