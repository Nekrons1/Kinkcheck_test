/* tests/suite.js — user-scenario tests. Run:  npm install jsdom  &&  node tests/suite.js
   Covers data integrity, i18n, form flows, links (incl. old-version links), My lists,
   Received, compare, PDF sheet. Exit code 0 = all passed. */
const { open, ok, eq, click, sleep, report } = require("./harness");
const fs = require("fs");
global.btoa = s => Buffer.from(s, "binary").toString("base64");
global.atob = s => Buffer.from(s, "base64").toString("binary");
const OLD = {}; new Function("OUT", fs.readFileSync(__dirname + "/fixtures/legacy-app-data.js", "utf8") +
  ";OUT.DATA=DATA;OUT.ORDER=ORDER;OUT.encodeState=encodeState;OUT.decodeState=decodeState;")(OLD);
const LAT = /[^\x00-\x7F]/;
const S = (title) => console.log("\n## " + title);

(async () => {
  /* ---------- 1. data integrity ---------- */
  S("data integrity");
  let p = open("form");
  const { KC } = p;
  ok(!p.errors.length, "no script errors on load: " + p.errors.join(" | "));
  const ids = [], codes = [];
  KC.CATS.forEach(c => c.items.forEach(([code, id]) => { ids.push(id); codes.push(code); }));
  eq(ids.length, 371, "item count");
  eq(new Set(ids).size, ids.length, "unique ids"); eq(new Set(codes).size, codes.length, "unique codes");
  eq(ids, OLD.ORDER, "ids+order identical to previous version (saved data compatible)");
  ["ru", "en", "pt"].forEach(l => {
    const miss = ids.filter(id => { const it = KC.i18n._pick("items", id, l); return !it || !it[0] || !it[1]; });
    eq(miss.length, 0, l + ": every item has name+hint (" + miss.slice(0, 3) + ")");
    const mc = KC.CATS.filter(c => !KC.i18n._pick("cats", c.id, l)); eq(mc.length, 0, l + ": every category named");
  });
  const enNames = ids.map(id => KC.i18n.item(id, "en").name); eq(new Set(enNames).size, 371, "EN names unique");
  const enCyr = ids.filter(id => LAT.test(KC.i18n.item(id, "en").desc.replace(/[’“”–—…]/g, ""))); eq(enCyr, [], "EN hints contain no Cyrillic");
  // ui key parity
  const src = l => fs.readFileSync(require("./harness").ROOT + "/js/lang/" + l + ".ui.js", "utf8").match(/"([a-zA-Z0-9_.]+)":/g).map(s => s.slice(1, -2));
  const kr = src("ru"), ke = src("en");
  eq(kr.filter(k => ke.indexOf(k) < 0), [], "keys in ru missing from en");
  eq(ke.filter(k => kr.indexOf(k) < 0), [], "keys in en missing from ru");
  const kp = src("pt");
  eq(ke.filter(k => kp.indexOf(k) < 0), [], "keys in en missing from pt");
  eq(kp.filter(k => ke.indexOf(k) < 0), [], "keys in pt missing from en");
  const ptEnLeft = ids.filter(id => KC.i18n.item(id, "pt").desc === KC.i18n.item(id, "en").desc); eq(ptEnLeft, [], "PT hints are translated (not English copies)");
  // every profile option has labels in both
  KC.PROFILE.forEach(f => f.opts.filter(Boolean).forEach(o => ["ru", "en", "pt"].forEach(l => { KC.i18n.set(l); ok(KC.i18n.optLabel(f.id, o) !== "profile." + f.id + "." + o, l + " label " + f.id + "." + o); })));
  // every t() key used in code exists
  const used = new Set();
  require("child_process").execSync("grep -rhoP \"(?<![A-Za-z.])t\\(\\\"[a-zA-Z0-9_.]+\\\"|data-i18n[a-z-]*=\\\"[a-zA-Z0-9_.]+\\\"\" " + require("./harness").ROOT).toString().split("\n").forEach(s => { const m = s.match(/"([^"]+)"/); if (m && !/\.$/.test(m[1])) used.add(m[1]); });
  eq([...used].filter(k => ke.indexOf(k) < 0), [], "all used keys defined");
  ok(!/switch/.test(JSON.stringify(KC.PROFILE[0].opts.filter(Boolean))), "switch removed from role options");

  /* all cache-busting versions in both pages must match */
  const vers = ["index.html", "compare.html"].map(f => fs.readFileSync(require("./harness").ROOT + "/" + f, "utf8").match(/[?]v=(\d+)|data-v="(\d+)"/g).map(x => x.replace(/\D/g, "")));
  eq(new Set([].concat(...vers)).size, 1, "cache versions consistent (css ?v, boot ?v, data-v): " + JSON.stringify(vers));

  /* ---------- 2. fresh user fills the form (RU) ---------- */
  S("fresh user, RU, fills in");
  p = open("form", { navLang: "ru" });
  let { w, d } = p;
  eq(p.KC.i18n.lang, "ru", "RU browser -> RU page");
  eq(d.querySelectorAll(".item").length, 371, "371 rows rendered");
  ok(!d.querySelector('#roleTop .opt[data-val="switch"]') && d.querySelectorAll("#roleTop .opt").length === 2, "role top: 2 buttons, no Switch");
  ok(!d.querySelector('#aboutBody .opt[data-field="role"]'), "role not duplicated in About me");
  ok(/Свитч/.test(d.querySelector(".role-explain").textContent), "switch still mentioned in text");
  ok(!/FormsPal|KinkSheet/.test(d.querySelector(".foot").textContent) && /открытых источников/.test(d.querySelector(".foot").textContent), "footer updated");
  const row = id => d.querySelector('.item[data-id="' + id + '"]');
  const ans = (id, v) => click(w, row(id).querySelector('.scale button[data-v="' + v + '"]'));
  ans("hugging", "love"); ans("blindfolds", "yes"); ans("spanking-hand", "maybe"); ans("fisting-anal", "limit"); ans("impact-bruising", "yes");
  ans("blindfolds", "yes"); // toggle off
  click(w, d.querySelector('#roleTop .opt[data-val="sub"]'));
  click(w, d.querySelector('.opt[data-field="exp"][data-val="medium"]'));
  click(w, d.querySelector('.opt[data-field="orient"][data-val="bi"]'));
  click(w, d.querySelector('.opt[data-field="rel"][data-val="poly"]'));
  click(w, d.querySelector('.opt[data-field="attire"][data-val="lace"]'));
  click(w, d.querySelector('.opt[data-field="attire"][data-val="leather"]'));
  const nm = d.getElementById("metaName"); nm.value = "Андрей"; nm.dispatchEvent(new w.Event("input"));
  ok(nm.classList.contains("bad"), "cyrillic name: soft hint, value kept"); eq(nm.value, "Андрей", "name not stripped");
  await sleep(260);
  let saved = JSON.parse(w.localStorage.getItem("practices-checklist-v1"));
  eq(saved.items, { hugging: { interest: "love" }, "spanking-hand": { interest: "maybe" }, "fisting-anal": { interest: "limit" }, "impact-bruising": { interest: "yes" } }, "answers saved (toggle-off removed)");
  eq(saved.meta, { role: "sub", exp: "medium", orient: "bi", rel: "poly", attire: ["lace", "leather"] }, "profile saved as keys");
  eq(d.getElementById("progress").textContent, "Отмечено 4 из 371 практик", "progress text");
  const link = p.KC.form.shareLink();
  ok(/[#&]lg=ru(&|$)/.test(link), "share link carries lg=ru");
  ok(/[#&]m=/.test(link), "share link carries profile (m=)");
  const back = p.KC.codec.decode(link);
  eq([back.meta, back.name, back.items, back.lang], [saved.meta, "Андрей", saved.items, "ru"], "link round-trip: profile+role+name+answers+lang");
  console.log("  link length:", link.length, link.slice(link.indexOf("#")));
  let own = p.storage();

  /* ---------- 3. language switch keeps everything ---------- */
  S("language switch");
  click(w, d.querySelector('#langSw button[data-lang="en"]'));
  eq(p.KC.i18n.lang, "en", "switched to EN");
  eq(w.localStorage.getItem("checklist-lang"), "en", "choice remembered");
  eq(d.querySelectorAll(".item-name .sub").length, 0, "EN page: english names only (no subtitles)");
  eq(row("hugging").querySelector(".main").textContent, "Hugging", "EN name shown");
  ok(!LAT.test(row("hugging").querySelector(".item-desc").textContent), "EN hint");
  ok(row("hugging").querySelector('.scale button[data-v="love"]').classList.contains("sel"), "answer survived switch");
  eq(row("hugging").querySelector('.scale button[data-v="love"]').textContent, "Love", "scale translated");
  ok(d.querySelector('#roleTop .opt[data-val="sub"]').getAttribute("aria-pressed") === "true", "role survived switch");
  eq(d.querySelector('#roleTop .opt[data-val="sub"]').textContent, "Submissive / Bottom", "role label translated");
  eq(d.getElementById("metaName").value, "Андрей", "name survived switch");
  eq(d.getElementById("progress").textContent, "4 of 371 practices marked", "EN progress");
  eq(d.getElementById("shareBtn").textContent, "Share", "header translated");
  eq(d.documentElement.lang, "en", "<html lang> updated");
  ok(/lg=en/.test(p.KC.form.shareLink()), "link now carries lg=en");
  const s = d.getElementById("search"); s.value = "spank"; s.dispatchEvent(new w.Event("input"));
  ok(d.querySelectorAll(".item:not(.filtered-out)").length > 3 && row("hugging").classList.contains("filtered-out"), "EN search works");
  click(w, d.querySelector('#langSw button[data-lang="pt"]'));
  eq(p.KC.i18n.lang, "pt", "switched to PT");
  eq(row("hugging").querySelector(".main").textContent, "Abraços", "PT name shown");
  eq(row("hugging").querySelector(".sub").textContent, "Hugging", "PT page: English subtitle");
  ok(row("hugging").querySelector('.scale button[data-v="love"]').classList.contains("sel"), "answer survived switch to PT");
  eq(row("hugging").querySelector('.scale button[data-v="love"]').textContent, "Adoro", "PT scale");
  eq(d.querySelector('#roleTop .opt[data-val="sub"]').textContent, "Submisso(a) / Bottom", "PT role label");
  eq(d.getElementById("progress").textContent, "4 de 371 práticas marcadas", "PT progress");
  const ptHash = p.KC.form.shareLink().split("#")[1];
  ok(/lg=pt/.test(ptHash), "PT link carries lg=pt");
  eq(open("form", { hash: ptHash, storage: { local: { "checklist-lang": "ru" }, session: {} } }).KC.i18n.lang, "pt", "PT link opens in PT");
  click(w, d.querySelector('#langSw button[data-lang="ru"]'));
  ok(row("hugging").classList.contains("filtered-out"), "search kept after switch");
  s.value = ""; s.dispatchEvent(new w.Event("input"));
  eq(row("hugging").querySelector(".sub").textContent, "Hugging", "RU page: EN subtitle back");
  own = p.storage();

  /* ---------- 4. recipient opens RU link ---------- */
  S("recipient opens link");
  const ruLink = link.slice(link.indexOf("#") + 1);
  let r = open("form", { hash: ruLink, navLang: "en", storage: { local: { "checklist-lang": "en" }, session: {} } });
  eq(r.KC.i18n.lang, "ru", "link lg=ru wins over recipient's EN preference");
  ok(r.d.getElementById("sharedBanner").style.display === "block", "banner shown");
  ok(r.d.getElementById("aboutSection").open, "About me unfolded for received list");
  ok(r.d.querySelector('.opt[data-field="attire"][data-val="lace"]').getAttribute("aria-pressed") === "true", "attire visible");
  ok(r.d.querySelector('#roleTop .opt[data-val="sub"]').getAttribute("aria-pressed") === "true", "role visible");
  eq(r.d.getElementById("metaName").value, "Андрей", "name visible");
  ok(r.w.location.hash === "", "hash stripped from address bar");
  ok(!r.w.localStorage.getItem("practices-checklist-v1"), "recipient's own storage untouched");
  eq(JSON.parse(r.w.localStorage.getItem("checklist-saved-profiles-v1")).length, 1, "saved to Received");
  eq(r.w.localStorage.getItem("checklist-lang"), "en", "recipient preference not overwritten");
  r.w.confirm = () => true; click(r.w, r.d.getElementById("resetBtn"));
  ok(!r.w.localStorage.getItem("practices-checklist-v1"), "Clear while viewing a link does not touch own list");
  // keep as own
  r = open("form", { hash: ruLink, storage: { local: {}, session: {} } });
  click(r.w, r.d.getElementById("bannerKeep"));
  eq(JSON.parse(r.w.localStorage.getItem("practices-checklist-v1")).meta.role, "sub", "'Use as my own' saves it");

  S("link language variants");
  const enLink = open("form", { storage: own, navLang: "ru" }); click(enLink.w, enLink.d.querySelector('#langSw button[data-lang="en"]'));
  const enHash = enLink.KC.form.shareLink().split("#")[1];
  eq(open("form", { hash: enHash, storage: { local: { "checklist-lang": "ru" }, session: {} } }).KC.i18n.lang, "en", "EN link opens EN for RU user");
  const noLg = ruLink.replace(/&?lg=ru/, "");
  eq(open("form", { hash: noLg, storage: { local: { "checklist-lang": "en" }, session: {} } }).KC.i18n.lang, "en", "old link without lg -> recipient preference");
  eq(open("form", { hash: noLg, navLang: "de" }).KC.i18n.lang, "ru", "no lg, unknown browser lang -> RU default");
  eq(open("form", { hash: noLg, navLang: "en-US" }).KC.i18n.lang, "en", "no lg, English browser -> EN");
  const es = open("form", { hash: ruLink.replace("lg=ru", "lg=es") });
  eq(es.KC.i18n.lang, "en", "lg=es (prepared, not enabled) -> EN fallback");
  eq([...es.d.querySelectorAll("#langSw button")].map(b => b.textContent), ["RU", "EN", "PT"], "switcher shows RU/EN/PT only");
  eq(open("form", { navLang: "pt-BR" }).KC.i18n.lang, "pt", "Brazilian browser -> PT");
  eq(open("form", { navLang: "pt-PT" }).KC.i18n.lang, "pt", "Portuguese browser -> PT");
  ok(es.KC.codec.decode("a=Ag&lg=ja").lang === "ja", "codec keeps prepared lang code ja");
  eq(es.KC.codec.decode("a=Ag&lg=xx").lang, null, "unknown lang code ignored");

  /* ---------- 5. backwards compatibility ---------- */
  S("backwards compatibility");
  const KCn = open("form").KC;
  let bad = 0;
  const vals = ["limit", "maybe", "yes", "love"];
  for (let trial = 0; trial < 60; trial++) {
    const n = [0, 1, 5, 40, 80, 150, 200, 300, 371][trial % 9], items = {};
    for (let i = 0; i < n; i++) items[OLD.ORDER[Math.floor(Math.random() * 371)]] = { interest: vals[Math.floor(Math.random() * 4)], role: "", tried: false };
    const oldMeta = { role: ["Доминант / Верх", "Сабмиссив / Низ"][trial % 2], exp: "Большой", orient: "Гей / Лесби", rel: "Моногамия", attire: ["Деним", "Латекс / резина"] };
    const oldHash = OLD.encodeState({ items, meta: oldMeta, name: "Old #" + trial });
    const dec = KCn.codec.decode(oldHash);
    const want = {}; Object.keys(items).forEach(k => want[k] = { interest: items[k].interest });
    if (JSON.stringify(Object.entries(dec.items).sort()) !== JSON.stringify(Object.entries(want).sort())) bad++;
    if (JSON.stringify(dec.meta) !== JSON.stringify({ role: trial % 2 ? "sub" : "dom", exp: "large", orient: "gay", rel: "mono", attire: ["denim", "latex"] })) bad++;
    if (dec.name !== "Old #" + trial) bad++;
  }
  eq(bad, 0, "60 links from the previous version decode identically (sparse+dense, profile, name)");
  const switchOld = OLD.encodeState({ items: {}, meta: { role: "Свитч", exp: "Новичок" } });
  eq(KCn.codec.decode(switchOld).meta, { exp: "novice" }, "old link with role Switch: role dropped, rest kept");
  eq(KCn.codec.decode("a=Ag&m=" + encodeURIComponent(JSON.stringify({ role: "Сабмиссив / Низ", attire: ["Кожа"] }))).meta, { role: "sub", attire: ["leather"] }, "legacy JSON profile");
  // legacy own storage with RU labels + role/tried/date
  const legacyState = { name: "L", date: "12.10", meta: { role: "Свитч", exp: "Средний", attire: ["Готика"] }, items: { hugging: { interest: "yes", role: "give", tried: true }, chains: { interest: null, role: "both", tried: true } }, onlyMarked: false };
  const lp = open("form", { storage: { local: { "practices-checklist-v1": JSON.stringify(legacyState) }, session: {} } });
  eq([lp.KC.form.state.meta, lp.KC.form.state.items, lp.KC.form.state.onlyMarked, "date" in lp.KC.form.state], [{ exp: "medium", attire: ["goth"] }, { hugging: { interest: "yes" } }, false, false], "old saved list migrated");
  ok(lp.d.querySelector('.opt[data-field="attire"][data-val="goth"]').getAttribute("aria-pressed") === "true", "migrated profile shown");

  /* links from the older deployed v371 (sparse-only encoder, same item order) */
  const V371 = {}; new Function("OUT", fs.readFileSync(__dirname + "/fixtures/legacy-v371-app-data.js", "utf8") + ";OUT.ORDER=ORDER;OUT.enc=encodeState;")(V371);
  eq(V371.ORDER, OLD.ORDER, "v371 item order identical");
  let bad371 = 0;
  for (let trial = 0; trial < 40; trial++) {
    const items = {}; const n = [0, 3, 50, 200, 371][trial % 5];
    for (let i = 0; i < n; i++) items[V371.ORDER[Math.floor(Math.random() * 371)]] = { interest: vals[Math.floor(Math.random() * 4)], role: "give", tried: true };
    const dec = KCn.codec.decode(V371.enc({ items, meta: { role: "Сабмиссив / Низ", attire: ["Кожа"] }, name: "N" + trial, date: "1.1" }));
    const want = {}; Object.keys(items).forEach(k => want[k] = { interest: items[k].interest });
    if (JSON.stringify(Object.entries(dec.items).sort()) !== JSON.stringify(Object.entries(want).sort()) || dec.name !== "N" + trial || JSON.stringify(dec.meta) !== JSON.stringify({ role: "sub", attire: ["leather"] })) bad371++;
  }
  eq(bad371, 0, "40 links from v371 decode identically");

  /* ---------- 6. codec robustness + future additions ---------- */
  S("codec");
  let rt = 0;
  for (let t = 0; t < 200; t++) {
    const items = {}, n = Math.floor(Math.random() * 372);
    for (let i = 0; i < n; i++) items[OLD.ORDER[Math.floor(Math.random() * 371)]] = { interest: vals[Math.floor(Math.random() * 4)] };
    const st = { items, meta: {}, name: "" };
    if (JSON.stringify(Object.entries(KCn.codec.decode(KCn.codec.encode(st)).items).sort()) !== JSON.stringify(Object.entries(items).sort())) rt++;
  }
  eq(rt, 0, "200 random round-trips");
  const all = {}; OLD.ORDER.forEach((id, i) => all[id] = { interest: vals[i % 4] });
  const lens = [0, 1, 40, 200, 371].map(n => { const it = {}; OLD.ORDER.slice(0, n).forEach(id => it[id] = all[id]); return KCn.codec.packAnswers(it).length; });
  console.log("  answer chars at 0/1/40/200/371 marks:", lens.join("/"));
  ok(lens[4] <= 200 && lens[3] <= 160, "links stay short");
  ["", "@@@", "a=", "a=!!!&m=%%%", "garbage#a=Zm9v", "#a=Ag&n=%E0%A4"].forEach(g => { let okk = true; try { KCn.codec.decode(g); } catch (e) { okk = false; } ok(okk, "no crash on junk " + JSON.stringify(g)); });
  // simulate a future release that adds items (new codes appended, inserted mid-category)
  const today = KCn.codec.encode({ items: all, meta: {} });
  const sparseToday = KCn.codec.encode({ items: { hugging: { interest: "yes" }, "impact-bruising": { interest: "love" } }, meta: {} });
  KCn.CATS[0].items.splice(3, 0, [371, "new-thing"]); KCn.CATS[5].items.push([372, "new-thing-2"]);
  const fut = open("form"); fut.KC.CATS[0].items.splice(3, 0, [371, "new-thing"]); fut.KC.CATS[5].items.push([372, "new-thing-2"]);
  eq(Object.keys(fut.KC.codec.decode(today).items).length, 371, "dense link from today still decodes after items are added");
  eq(fut.KC.codec.decode(sparseToday).items, { hugging: { interest: "yes" }, "impact-bruising": { interest: "love" } }, "sparse link from today still decodes after items are added");

  /* ---------- 7. My lists ---------- */
  S("My lists");
  p = open("form", { storage: own, answers: { prompt: "Для Б" } });
  click(p.w, p.d.getElementById("mineBtn"));
  click(p.w, p.d.getElementById("mineSaveNew"));
  eq(JSON.parse(p.w.localStorage.getItem("checklist-my-profiles-v1"))[0].name, "Для Б", "saved as new list");
  eq(p.d.querySelectorAll("#mineList .saved-row").length, 1, "listed");
  let st2 = p.storage(); const other = JSON.parse(st2.local["practices-checklist-v1"]); other.items = { chains: { interest: "love" } }; other.meta = {};
  st2.local["practices-checklist-v1"] = JSON.stringify(other);
  p = open("form", { storage: st2 });
  click(p.w, p.d.getElementById("mineBtn"));
  click(p.w, p.d.querySelector('#mineList button[data-act="load"]'));
  eq(JSON.parse(p.w.localStorage.getItem("practices-checklist-v1")).meta.role, "sub", "Load restores full list incl. role");

  /* ---------- 8. compare ---------- */
  S("compare");
  const A = { items: { hugging: { interest: "love" }, chains: { interest: "yes" }, "spanking-hand": { interest: "maybe" }, "fisting-anal": { interest: "limit" }, orgy: { interest: "yes" }, "anal-sex": { interest: "love" } }, meta: { role: "dom", exp: "large" }, name: "Anna" };
  const B = { items: { hugging: { interest: "yes" }, chains: { interest: "maybe" }, "spanking-hand": { interest: "maybe" }, "fisting-anal": { interest: "love" }, "rope-bondage-shibari": { interest: "yes" } }, meta: { role: "sub", attire: ["latex"] }, name: "Boris" };
  const g = KCn.match.group(A, B);
  eq([g.match.map(x => x.id), g.discuss.map(x => x.id), g.oneA.map(x => x.id), g.oneB.map(x => x.id), g.excluded.map(x => x.id)],
    [["hugging"], ["chains", "spanking-hand"], ["anal-sex", "orgy"], ["rope-bondage-shibari"], ["fisting-anal"]], "grouping incl. A/B split");
  const own2 = { local: { "practices-checklist-v1": JSON.stringify(Object.assign(KCn.store.blank(), A)) }, session: {} };
  let c = open("compare", { storage: own2, navLang: "ru" });
  ok(!c.errors.length, "compare loads: " + c.errors.join("|"));
  eq(c.d.getElementById("nameA").value, "Anna", "A prefilled with own list");
  c.d.getElementById("codeB").value = "https://x/#" + KCn.codec.encode(B, "en");
  click(c.w, c.d.getElementById("cmpBtn"));
  const titles = () => [...c.d.querySelectorAll(".result-group h3")].map(h => h.textContent.replace(/\s*\(\d+\)$/, ""));
  eq(titles(), ["Совпадения — оба «за»", "Стоит обсудить", "Интересно только Anna", "Интересно только Boris", "Исключено — стоп"], "RU groups, one-sided split A then B");
  eq(c.d.querySelectorAll(".cmp-profile").length, 2, "profile line for both people");
  ok(/Сабмиссив/.test(c.d.querySelectorAll(".cmp-profile")[1].textContent) && /Латекс/.test(c.d.querySelectorAll(".cmp-profile")[1].textContent), "B's role+attire shown");
  click(c.w, c.d.querySelector('button[data-f="yesA"]'));
  const yesA = [...c.d.querySelectorAll(".rrow")].length; eq(yesA, 4, "filter «Да» у Anna: 4 items (love first)");
  ok(c.d.querySelector('button[data-f="yesA"]').classList.contains("on"), "active filter highlighted");
  click(c.w, c.d.querySelector('button[data-f="yesB"]')); eq(c.d.querySelectorAll(".rrow").length, 3, "filter «Да» у Boris: 3 items");
  click(c.w, c.d.querySelector('#langSw button[data-lang="en"]'));
  eq(c.d.querySelectorAll(".rrow").length, 3, "results survive language switch (filter kept)");
  ok(/“Yes” from Boris/.test(c.d.querySelector(".cmp-filter").textContent), "filter labels translated");
  eq(c.d.querySelectorAll(".rrow .sub").length, 0, "EN compare: english names only");
  ok(/index\.html\?lang=en/.test(c.d.getElementById("backLink").href), "back link keeps language");
  // hand-off from form
  const hand = open("form", { storage: own2 });
  hand.KC.form.startCompare("a=Ag", KCn.codec.encode(B), "Me", "Boris");
  c = open("compare", { storage: hand.storage() });
  eq(c.d.getElementById("nameB").value, "Boris", "hand-off fills B"); ok(c.d.querySelectorAll(".result-group").length > 0, "hand-off auto-compares");
  eq(c.w.sessionStorage.getItem("cmpA"), null, "hand-off data consumed");
  c = open("compare"); click(c.w, c.d.getElementById("cmpBtn")); eq(c.d.getElementById("toast").textContent, "Вставьте обе ссылки", "empty compare warns");

  /* ---------- 9. PDF sheet ---------- */
  S("PDF sheet");
  p = open("form", { storage: own });
  let sheet = p.KC.form.buildSheet().textContent;
  ok(/Андрей/.test(sheet) && /Сабмиссив/.test(sheet) && /Объятия/.test(sheet) && /Жёсткие лимиты/.test(sheet), "RU sheet content");
  click(p.w, p.d.querySelector('#langSw button[data-lang="en"]'));
  sheet = p.KC.form.buildSheet().textContent;
  ok(/Submissive \/ Bottom/.test(sheet) && /Hugging/.test(sheet) && /Hard limits/.test(sheet) && !/[а-яё]/i.test(sheet.replace("Андрей", "")), "EN sheet fully English");

  click(p.w, p.d.querySelector('#langSw button[data-lang="pt"]'));
  sheet = p.KC.form.buildSheet().textContent;
  ok(/Submisso\(a\) \/ Bottom/.test(sheet) && /Abraços/.test(sheet) && /Limites rígidos/.test(sheet), "PT sheet");
  c = open("compare", { storage: own2, navLang: "pt-BR" });
  c.d.getElementById("codeB").value = "#" + KCn.codec.encode(B);
  click(c.w, c.d.getElementById("cmpBtn"));
  eq(titles(), ["Em comum: os dois topam", "Vale conversar", "Só Anna tem interesse", "Só Boris tem interesse", "Excluídos: pare"], "PT compare groups");

  const R = report(); console.log("\nPASS", R.PASS, "FAIL", R.FAIL);
  process.exit(R.FAIL ? 1 : 0);
})().catch(e => { console.error("CRASH", e); process.exit(2); });
