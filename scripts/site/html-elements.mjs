// Balanced element walk of built HTML (cms-plan part 2 K3): the build's data-vi embedding and the locale build that drops
// data-vi-only / data-en-only elements share it, so neither relies on a greedy regex. Pure module, no Node built-ins.
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

// Every opening tag in source order: { name, tag, start, contentStart, contentEnd?, end? }; contentEnd and end are set once the
// matching closing tag is found (void and self-closing elements, and unclosed ones, have neither).
export function htmlElements(html) {
  const stack = [];
  const elements = [];
  const tagPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const token = match[0];
    if (token.startsWith("<!")) continue;
    const name = token.match(/^<\/?([a-z][\w:-]*)/i)?.[1].toLowerCase();
    if (!name) continue;
    if (token.startsWith("</")) {
      const index = stack.findLastIndex((entry) => entry.name === name);
      if (index < 0) continue;
      const [entry] = stack.splice(index, 1);
      entry.contentEnd = match.index;
      entry.end = tagPattern.lastIndex;
      continue;
    }
    const entry = { name, tag: token, start: match.index, contentStart: tagPattern.lastIndex };
    elements.push(entry);
    // Script and style bodies are raw text: a tag inside a string there is not an element.
    if (name === "script" || name === "style") {
      const closing = new RegExp(`</${name}`, "gi");
      closing.lastIndex = tagPattern.lastIndex;
      const close = closing.exec(html)?.index ?? -1;
      if (close < 0) continue;
      const closeEnd = html.indexOf(">", close);
      Object.assign(entry, { contentEnd: close, end: closeEnd < 0 ? html.length : closeEnd + 1 });
      tagPattern.lastIndex = entry.end;
      continue;
    }
    if (!/\/$/.test(token.slice(0, -1).trim()) && !VOID.has(name)) stack.push(entry);
  }
  return elements;
}

// Drops every element whose opening tag has the attribute (nested matches go with their outer one). Quoted values are
// blanked before the test, so the name inside another attribute's value does not count. An element carrying it that has no
// closing tag (void, self-closing, unclosed) stops the build instead of shipping its content in the wrong locale.
export function dropElements(html, attribute) {
  const pattern = new RegExp(`\\s${attribute}(?=[\\s=>/])`, "i");
  const spans = [];
  for (const { tag, start, end } of htmlElements(html)) {
    if (!pattern.test(tag.replace(/"[^"]*"|'[^']*'/g, '""'))) continue;
    if (end === undefined) throw new Error(`${attribute} on an element without a closing tag: ${tag}`);
    if (!spans.some((span) => start >= span.start && start < span.end)) spans.push({ start, end });
  }
  return spans.reduceRight((output, { start, end }) => output.slice(0, start) + output.slice(end), html);
}
