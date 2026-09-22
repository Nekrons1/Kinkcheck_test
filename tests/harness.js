/* tests/harness.js — loads a page into jsdom and runs the modules in boot.js order. */
const fs = require("fs"), path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const vc = new VirtualConsole(); vc.on("jsdomError", e => { if (!/Not implemented: navigation/.test(e.message)) console.error(e.message); });
const ROOT = process.env.SITE || path.join(__dirname, "..");
const BASE = "https://nekrons1.github.io/Kinkcheck/";

let PASS = 0, FAIL = 0; const fails = [];
function ok(c, m) { if (c) PASS++; else { FAIL++; fails.push(m); console.log("  FAIL:", m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + "  got=" + JSON.stringify(a) + " want=" + JSON.stringify(b)); }

function manifest() {
  const w = { document: {} }; new Function("window", "document", fs.readFileSync(ROOT + "/js/boot.js", "utf8"))(w, {}); return w.KC_MANIFEST;
}
/* open a page. storage: {local:{}, session:{}} carried between "page loads" */
function open(page, { hash = "", search = "", storage = { local: {}, session: {} }, navLang = "ru", answers = {} } = {}) {
  const file = page === "compare" ? "compare.html" : "index.html";
  const html = fs.readFileSync(path.join(ROOT, file), "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, { url: BASE + file + search + (hash ? "#" + hash : ""), runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  Object.defineProperty(w.navigator, "language", { value: navLang, configurable: true });
  for (const k in storage.local) w.localStorage.setItem(k, storage.local[k]);
  for (const k in storage.session) w.sessionStorage.setItem(k, storage.session[k]);
  w.confirm = () => answers.confirm !== false;
  w.prompt = (q, d) => answers.prompt !== undefined ? answers.prompt : d;
  w.QRCode = function () {}; w.QRCode.CorrectLevel = { M: 0 };
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  w.nav = null; // capture navigations
  const m = manifest();
  const files = m.common.concat(m[page === "compare" ? "compare" : "form"]);
  const errors = [];
  w.addEventListener("error", e => errors.push(e.message));
  for (const f of files) {
    try { w.eval(fs.readFileSync(path.join(ROOT, "js", f), "utf8") + "\n//# sourceURL=" + f); }
    catch (e) { errors.push(f + ": " + e.message); }
  }
  return { dom, w, d: w.document, KC: w.KC, errors, storage: () => dump(w) };
}
function dump(w) {
  const local = {}, session = {};
  for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); local[k] = w.localStorage.getItem(k); }
  for (let i = 0; i < w.sessionStorage.length; i++) { const k = w.sessionStorage.key(i); session[k] = w.sessionStorage.getItem(k); }
  return { local, session };
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = { open, ok, eq, click, sleep, ROOT, BASE, report: () => ({ PASS, FAIL, fails }) };
