// Cloud-only test preload: Playwright Firefox keeps its own cert store and rejects the
// cloud egress proxy CA, so its HTTPS requests are fetched by Node (which trusts that CA
// via NODE_EXTRA_CA_CERTS and still verifies certificates) and fulfilled with the same bytes.
// Usage: node --import ./tests/site/support/firefox-cloud-ca.mjs <runner>
import { createRequire } from "node:module";

const { firefox } = createRequire(`${process.cwd()}/package.json`)("playwright");
const launch = firefox.launch.bind(firefox);
firefox.launch = async (...args) => {
  const browser = await launch(...args);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...options) => {
    const context = await newContext(...options);
    await context.route(/^https:\/\//, async (route) => route.fulfill({ response: await route.fetch() }));
    return context;
  };
  return browser;
};
