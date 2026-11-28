// Record id and VI slug from a Vietnamese name (cms-editor R2): lower case, no marks (đ becomes d), words joined by "-", at most 80 characters.
export function slugOf(name) {
  return String(name ?? "")
    .normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "")
    .slice(0, 80).replace(/-+$/, "");
}
