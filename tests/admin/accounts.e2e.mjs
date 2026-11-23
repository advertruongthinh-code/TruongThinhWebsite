import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

// Accounts panel (cms-editor-ops R6) on the static preview after `node scripts/cms/build-admin.mjs`, with the account commands
// answered by an in-page fake: add, role change, lock through the dialog, last owner 409, Access 502, accessSynced false; staff see no panel.
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const shot = process.env.SHOT; // optional path for a 1440px screenshot of the panel
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

async function open(role, fake) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.route("**/api/admin/account-*", async (route) => {
    const command = new URL(route.request().url()).pathname.split("/").pop();
    if (role !== "owner") return route.fulfill({ status: 403, json: { error: "Forbidden" } });
    const [status, json] = fake(command, route.request().postDataJSON());
    return route.fulfill({ status, json });
  });
  await page.goto(`${baseUrl}/admin/index.html`);
  await page.waitForSelector(".dv-tab");
  return { page, errors };
}

const accounts = [
  { email: "owner@example.com", role: "owner", status: "active", updated_at: "2026-11-23T10:00:00.000Z" },
  { email: "staff@example.com", role: "staff", status: "active", updated_at: "2026-11-23T11:00:00.000Z" },
  { email: "old@example.com", role: "staff", status: "locked", updated_at: "2026-11-20T09:00:00.000Z" },
];
let accessDown = false;
function fake(command, body) {
  const now = new Date().toISOString();
  if (command === "account-list") return [200, { items: [...accounts].sort((a, b) => a.email.localeCompare(b.email)), me: "owner@example.com", accessDrift: null }];
  if (command === "account-add") {
    if (accessDown) return [502, { error: "access" }];
    accounts.push({ email: body.email.trim().toLowerCase(), role: body.role, status: "active", updated_at: now });
    return [201, { email: body.email, role: body.role, status: "active" }];
  }
  const row = accounts.find((item) => item.email === body.email);
  const next = { ...row, ...body };
  const owners = accounts.filter((item) => item !== row && item.role === "owner" && item.status === "active").length;
  if ((next.role !== "owner" || next.status !== "active") && owners === 0) return [409, { error: "last-owner" }];
  Object.assign(row, next, { updated_at: now });
  return [200, { ...next, accessSynced: !(next.status === "locked" && accessDown) }];
}

try {
  const { page, errors } = await open("owner", fake);
  await page.click(".topbar__menu > summary");
  await page.getByRole("button", { name: "Tài khoản" }).click();
  const panel = page.locator(".panel--accounts");
  await panel.locator(".acc-row").first().waitFor();
  assert.equal(await panel.locator(".acc-row").count(), 3);
  assert.equal(await panel.locator(".acc-row.is-locked").count(), 1);

  // Add a staff member.
  await panel.getByLabel("Email Google").fill("New.Person@Example.com");
  await panel.getByRole("button", { name: "Thêm" }).click();
  await panel.locator(".acc-row", { hasText: "new.person@example.com" }).waitFor();

  // Access down: add answers 502, the list does not change.
  accessDown = true;
  await panel.getByLabel("Email Google").fill("late@example.com");
  await panel.getByRole("button", { name: "Thêm" }).click();
  await panel.getByText("Chưa đổi được quyền đăng nhập, thử lại sau.").waitFor();
  assert.equal(await panel.locator(".acc-row").count(), 4);

  // Lock with Access down: confirm dialog, row locked, warning with "Thử lại"; retry after Access is back clears it.
  const staff = panel.locator(".acc-row", { hasText: "staff@example.com" });
  await staff.getByRole("button", { name: "Khóa" }).click();
  await page.locator(".acc-dialog").getByRole("button", { name: "Khóa" }).click();
  await staff.getByText("Đã khóa trong CMS, chưa gỡ được khỏi đăng nhập.").waitFor();
  assert.equal(await staff.locator(".acc-badge").textContent(), "Đã khóa");
  accessDown = false;
  await staff.getByRole("button", { name: "Thử lại" }).click();
  await staff.getByText("Đã khóa trong CMS").waitFor({ state: "detached" });

  // Promote, then try to lock the only active owner: 409 sentence, nothing changes.
  const me = panel.locator(".acc-row", { hasText: "owner@example.com" });
  await me.getByRole("button", { name: "Khóa" }).click();
  await page.locator(".acc-dialog").getByRole("button", { name: "Khóa" }).click();
  await panel.getByText("Phải còn ít nhất một owner đang mở.").waitFor();
  assert.equal(await me.locator(".acc-badge").textContent(), "Đang mở");

  // Reopen a locked person.
  await panel.locator(".acc-row", { hasText: "old@example.com" }).getByRole("button", { name: "Mở lại" }).click();
  await panel.locator(".acc-row", { hasText: "old@example.com" }).locator(".acc-badge", { hasText: "Đang mở" }).waitFor();

  // Emails never reach localStorage.
  assert.ok(!(await page.evaluate(() => JSON.stringify({ ...localStorage }))).includes("example.com"));
  if (shot) {
    await panel.getByLabel("Email Google").fill("");
    await page.screenshot({ path: shot });
  }
  assert.deepEqual(errors, []);

  const staffView = await open("staff", fake);
  await staffView.page.click(".topbar__menu > summary");
  assert.equal(await staffView.page.getByRole("button", { name: "Tài khoản" }).count(), 0);
  console.log("accounts e2e ok");
} finally {
  await browser.close();
}
