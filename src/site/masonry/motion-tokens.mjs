// Motion values the masonry scripts share with the CSS root tokens (style.css :root). tests/site/motion-tokens.test.mjs
// keeps every value that has a CSS token equal to it, so a change goes to both places. design-system/motion.md lists the tokens.
export const EASE = {
  // --ease
  standard: "cubic-bezier(0, 0, 0.26, 1)",
  // --ease-expo-out
  expoOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  // --ease-card
  card: "cubic-bezier(0.65, 0, 0.35, 1)",
  // --ease-viewer
  viewer: "cubic-bezier(0.55, 0, 0, 1)",
  // No CSS token: the suggestion and strip push (design-system/motion.md, "Horizontal push").
  push: "cubic-bezier(0.76, 0, 0.24, 1)",
};

// Milliseconds.
export const DUR = {
  quick: 250, // --dur-quick
  base: 300, // --dur-base
  card: 400, // --dur-card
  fade: 450, // --dur-fade
  hover: 600, // --dur-hover
};
