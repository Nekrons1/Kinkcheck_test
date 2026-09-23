/* compare/main.js — compare.html: read two links, classify every item (core/match.js), render
   grouped results with filters "All / Yes from A / Yes from B". Re-renders on language switch. */
(function (KC) {
  const t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  const BADGE = { love: "b-match", yes: "b-good", maybe: "b-maybe", limit: "b-limit" };
  let LAST = null, FILTER = "all";

  KC.initTheme();
  KC.i18n.set(KC.i18n.detect(null));
  function applyStatic() { KC.i18n.apply(document); KC.$("backLink").href = "index.html?lang=" + KC.i18n.lang; }
  KC.i18n.mountSwitcher(() => { applyStatic(); if (LAST) render(false); });
  applyStatic();

  const badge = v => v ? '<span class="badge ' + BADGE[v] + '">' + esc(t("scale." + v)) + "</span>" : '<span class="badge b-one">—</span>';
  const itemName = id => {
    const sub = KC.i18n.lang !== "en" ? '<span class="sub">' + esc(KC.i18n.item(id, "en").name) + "</span>" : "";
    return esc(KC.i18n.item(id).name) + sub;
  };
  const row = r => {
    const desc = KC.i18n.item(r.id).desc;
    return '<div class="rrow"><div class="nm">' + itemName(r.id) + "</div>"
      + (desc ? '<button class="mini help" type="button" data-act="help" aria-label="' + esc(t("item.help")) + '">?</button>' : "")
      + '<div class="who">' + esc(LAST.nA) + ": " + badge(r.a) + " &nbsp; " + esc(LAST.nB) + ": " + badge(r.b) + "</div>"
      + (desc ? '<div class="item-desc" hidden>' + esc(desc) + "</div>" : "") + "</div>";
  };
  const block = (title, dot, sub, rows) => !rows.length ? "" :
    '<div class="result-group"><h3><span class="dot" style="background:' + dot + '"></span>' + esc(title)
    + ' <span style="font-weight:400;color:var(--muted);font-size:14px">(' + rows.length + ')</span></h3><div class="sub">' + esc(sub) + "</div>" + rows.map(row).join("") + "</div>";

  /* one line per person: role, experience, ... */
  function profileLine(name, st) {
    const bits = [];
    KC.PROFILE.forEach(f => { const v = st.meta[f.id]; if (v) bits.push(esc(KC.i18n.fieldLabel(f.id)) + ": " + esc((Array.isArray(v) ? v : [v]).map(o => KC.i18n.optLabel(f.id, o)).join(", "))); });
    return bits.length ? '<div class="cmp-profile"><b>' + esc(name) + "</b> · " + bits.join(" · ") + "</div>" : "";
  }
  function filterBar() {
    const b = (f, label) => '<button class="btn mini' + (FILTER === f ? " on" : "") + '" data-f="' + f + '">' + esc(label) + "</button>";
    return '<div class="cmp-filter">' + b("all", t("cmp.all")) + b("yesA", t("cmp.yesOf", { who: LAST.nA })) + b("yesB", t("cmp.yesOf", { who: LAST.nB })) + "</div>";
  }

  /* search: same matching as the form (current-language name + English name) */
  function matches(id) {
    const q = KC.$("cmpSearch").value.trim().toLowerCase(); if (!q) return true;
    return (KC.i18n.item(id).name + " " + KC.i18n.item(id, "en").name).toLowerCase().indexOf(q) >= 0;
  }
  const only = rows => rows.filter(r => matches(r.id));

  function render(scroll) {
    const box = KC.$("results");
    KC.$("cmpSearchBox").hidden = false;
    const searching = !!KC.$("cmpSearch").value.trim();
    let html = filterBar() + profileLine(LAST.nA, LAST.A) + profileLine(LAST.nB, LAST.B);
    if (FILTER === "yesA" || FILTER === "yesB") {
      const side = FILTER === "yesA", who = side ? LAST.nA : LAST.nB;
      const rows = only(KC.match.yesOf(side ? LAST.A : LAST.B)).map(r => ({ id: r.id, a: (LAST.A.items[r.id] || {}).interest || null, b: (LAST.B.items[r.id] || {}).interest || null }));
      html += rows.length ? block(t("cmp.yesTitle", { who }), "var(--yes)", t("cmp.yesSub"), rows)
        : '<div class="result-group"><div class="sub">' + esc(searching ? t("noresults") : t("cmp.noYes", { who })) + "</div></div>";
    } else {
      const g = KC.match.group(LAST.A, LAST.B);
      Object.keys(g).forEach(k => { g[k] = only(g[k]); });
      const ex = g.exBoth.length + g.exA.length + g.exB.length;
      const disc = g.discA.length + g.discB.length + g.discBoth.length;
      const total = g.match.length + disc + g.oneA.length + g.oneB.length + ex;
      if (!total) html += '<div class="result-group"><div class="sub">' + esc(searching ? t("noresults") : t("cmp.none")) + "</div></div>";
      else {
        const stat = (n, color, key) => '<div class="cmp-stat"><b style="color:' + color + '">' + n + "</b>" + esc(t(key)) + "</div>";
        html += '<div class="cmp-summary">' + stat(g.match.length, "var(--love)", "cmp.stat.match") + stat(disc, "var(--maybe)", "cmp.stat.discuss")
          + stat(g.oneA.length + g.oneB.length, "var(--chip-ink)", "cmp.stat.one") + stat(ex, "var(--limit)", "cmp.stat.excluded") + "</div>";
        html += block(t("cmp.g.match"), "var(--love)", t("cmp.g.match.sub"), g.match);
        html += block(t("cmp.g.discOne", { who: LAST.nA }), "var(--maybe)", t("cmp.g.discOne.sub", { who: LAST.nA }), g.discA);
        html += block(t("cmp.g.discOne", { who: LAST.nB }), "var(--maybe)", t("cmp.g.discOne.sub", { who: LAST.nB }), g.discB);
        html += block(t("cmp.g.discBoth"), "var(--maybe)", t("cmp.g.discBoth.sub"), g.discBoth);
        html += block(t("cmp.g.one", { who: LAST.nA }), "var(--chip-ink)", t("cmp.g.one.sub", { who: LAST.nA }), g.oneA);
        html += block(t("cmp.g.one", { who: LAST.nB }), "var(--chip-ink)", t("cmp.g.one.sub", { who: LAST.nB }), g.oneB);
        html += block(t("cmp.g.exBoth"), "var(--limit)", t("cmp.g.exBoth.sub"), g.exBoth);
        html += block(t("cmp.g.exOne", { who: LAST.nA }), "var(--limit)", t("cmp.g.exOne.sub", { who: LAST.nA }), g.exA);
        html += block(t("cmp.g.exOne", { who: LAST.nB }), "var(--limit)", t("cmp.g.exOne.sub", { who: LAST.nB }), g.exB);
      }
    }
    box.innerHTML = html;
    if (scroll && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  KC.$("cmpBtn").addEventListener("click", () => {
    const rawA = KC.$("codeA").value.trim(), rawB = KC.$("codeB").value.trim();
    if (!rawA || !rawB) { KC.toast(t("cmp.needBoth")); return; }
    const A = KC.codec.decode(rawA), B = KC.codec.decode(rawB);
    LAST = { A, B, nA: KC.$("nameA").value.trim() || A.name || t("cmp.listA"), nB: KC.$("nameB").value.trim() || B.name || t("cmp.listB") };
    FILTER = "all"; KC.$("cmpSearch").value = ""; render(true);
  });
  KC.$("cmpSearch").addEventListener("input", () => { if (LAST) render(false); });
  KC.$("results").addEventListener("click", e => {
    const h = e.target.closest('button[data-act="help"]');
    if (h) { const d = h.parentNode.querySelector(".item-desc"); if (d) { d.hidden = !d.hidden; h.classList.toggle("on", !d.hidden); } return; }
    const b = e.target.closest("button[data-f]"); if (!b || !LAST) return; FILTER = b.dataset.f; render(false);
  });

  function fillMine(quiet) {
    if (!KC.store.hasOwn()) { if (!quiet) KC.toast(t("cmp.noMine")); return; }
    const own = KC.store.loadOwn();
    KC.$("codeA").value = KC.codec.encode(own);
    KC.$("nameA").value = own.name || t("label.mine");
    if (!quiet) KC.toast(t("cmp.filled"));
  }
  KC.$("fillMine").addEventListener("click", () => fillMine(false));

  /* hand-off from the form ("Compare with mine" / Received -> Compare) */
  let handed = false;
  try {
    const a = sessionStorage.getItem("cmpA"), b = sessionStorage.getItem("cmpB");
    if (a !== null || b !== null) {
      handed = true;
      if (a) KC.$("codeA").value = a; if (b) KC.$("codeB").value = b;
      const an = sessionStorage.getItem("cmpAName"), bn = sessionStorage.getItem("cmpBName");
      if (an) KC.$("nameA").value = an; if (bn) KC.$("nameB").value = bn;
      ["cmpA", "cmpB", "cmpAName", "cmpBName"].forEach(k => sessionStorage.removeItem(k));
      if (a && b) KC.$("cmpBtn").click();
    }
  } catch (e) {}
  /* otherwise column A defaults to my own list */
  if (!handed && !KC.$("codeA").value.trim()) fillMine(true);
})(window.KC);
