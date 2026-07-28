import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "screenshots");
fs.mkdirSync(outDir, { recursive: true });
const base = "http://localhost:8080";

const pages = [
  { path: "/", file: "dashboard.png", ready: ".dashboard-grid .btn-ux", wait: 1000 },
  { path: "/ordenes", file: "ordenes.png", ready: "table tbody tr", api: "/api/ordenes?", wait: 800 },
  { path: "/nuevaot", file: "nueva-orden.png", ready: "text=Guardar Orden", wait: 800 },
  { path: "/equipos", file: "stock.png", ready: "text=BAT-IPH13", wait: 800 },
  { path: "/clientes", file: "clientes.png", ready: "text=TechStore", wait: 800 },
  { path: "/calendario", file: "calendario.png", ready: ".fc-daygrid-event, .cal-event, text=Entrega", wait: 1000 },
  { path: "/pendientes", file: "pendientes.png", ready: "text=Avisar a", wait: 800 },
];

async function dismissNoise(page) {
  for (const sel of [
    ".msn-close",
    ".week-startup-msn button",
    "[data-msn-close]",
    ".toast .btn-close",
    "button[aria-label='Cerrar']",
  ]) {
    const btns = page.locator(sel);
    const n = await btns.count();
    for (let i = 0; i < n; i++) {
      try {
        await btns.nth(i).click({ timeout: 300 });
      } catch {
        /* ignore */
      }
    }
  }
  // Cerrar leyenda de órdenes si quedó abierta
  const legend = page.locator("text=ÓRDENES EN SISTEMA");
  if (await legend.count()) {
    try {
      await page.keyboard.press("Escape");
    } catch {
      /* ignore */
    }
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto(`${base}/demo`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("text=RepaLab Demo", { timeout: 30000 });
await page.waitForTimeout(1500);
await dismissNoise(page);

for (const item of pages) {
  const apiWait = item.api
    ? page.waitForResponse(
        (res) => res.url().includes(item.api) && res.status() === 200,
        { timeout: 25000 },
      )
    : null;

  await page.goto(`${base}${item.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (apiWait) {
    try {
      await apiWait;
    } catch {
      console.warn("api timeout", item.api);
    }
  }
  try {
    await page.waitForSelector(item.ready, { timeout: 20000 });
  } catch {
    console.warn("selector timeout", item.ready);
  }
  await page.waitForTimeout(item.wait);
  await dismissNoise(page);
  const target = path.join(outDir, item.file);
  await page.screenshot({ path: target, fullPage: false });
  console.log("ok", item.file, fs.statSync(target).size);
}

await page.goto(`${base}/logout`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("text=Ver demo", { timeout: 15000 });
await page.waitForTimeout(600);
const loginPath = path.join(outDir, "login-demo.png");
await page.screenshot({ path: loginPath, fullPage: false });
console.log("ok login-demo.png", fs.statSync(loginPath).size);

await browser.close();
