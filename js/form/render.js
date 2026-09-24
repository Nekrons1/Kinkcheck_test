/* form/render.js — builds the form DOM from data + current language, and paints state onto it.
   Everything here can be re-run at any time (language switch calls F.renderAll()). */
(function (KC) {
  const F = KC.form = { state: KC.store.blank(), viewingShared: false,
    viewTpl: null,   /* someone's list viewed "through a template" (not stored) */
    favKey: null };  /* someone's list: key of its favourites in KC.store.favs */
  const t = (k, v) => KC.i18n.t(k, v), esc = KC.esc;
  F.SCALE = ["limit", "maybe", "yes", "love"];

  /* ---- template in effect: own list -> the one it is filled by; someone's list -> the one it is viewed through.
     Items outside it are hidden and left out of links, PDF and compare, but their answers are never deleted. ---- */
  F.tpl = () => (F.viewingShared ? F.viewTpl : F.state.template) || null;
  let tplSrc = null, tplMap = null;
  F.tplSet = () => { const tp = F.tpl(); if (!tp) return null; if (tplSrc !== tp) { tplSrc = tp; tplMap = {}; tp.ids.forEach(id => { tplMap[id] = 1; }); } return tplMap; };
  /* the list as it leaves the page: only the template's answers */
  F.shown = () => { const tp = F.tpl(); return tp ? KC.store.trim(F.state, tp.ids) : F.state; };
  /* tp: {id, name, ids} or null */
  F.setTpl = function (tp) {
    if (F.viewingShared) F.viewTpl = tp || null;
    else { if (tp) F.state.template = tp; else delete F.state.template; F.saveNow(); }
    F.renderTplUI(); F.applySearch(); F.updateProgress();
  };

  /* "Fill by this template": the own list (the one selected in My lists) gets the template; its answers stay */
  F.fillByTpl = function (tp) {
    if (!F.viewingShared) { F.setTpl(tp); KC.toast(t("toast.tplOn", { name: tp.name || t("unnamed") })); return; }
    const own = KC.store.loadOwn(); own.template = tp;
    if (!own.uid) own.uid = KC.store.newUid();
    KC.store.writeOwn(own); KC.store.mine.sync(own);
    location.href = location.pathname;
  };

  /* ---- favourites (♥): own list -> state.fav; someone's list -> KC.store.favs under F.favKey. Never in links. ---- */
  let memFav = []; /* someone's list without a key (damaged link): kept only while the page is open */
  F.favList = () => F.viewingShared ? (F.favKey ? KC.store.favs.get(F.favKey) : memFav.slice()) : (F.state.fav || []).slice();
  F.setFavs = function (ids) {
    if (F.viewingShared) { if (F.favKey) KC.store.favs.set(F.favKey, ids); else memFav = ids.slice(); }
    else { if (ids.length) F.state.fav = ids.slice(); else delete F.state.fav; F.save(); }
  };
  F.toggleFav = function (id) {
    const a = F.favList(), i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else a.push(id);
    F.setFavs(a); return i < 0;
  };
  F.paintFav = function (row, on) {
    const b = row.querySelector('button[data-act="fav"]'); if (!b) return;
    b.textContent = on ? "♥" : "♡"; b.setAttribute("aria-pressed", on ? "true" : "false"); b.classList.toggle("on", on);
    row.classList.toggle("is-fav", on);
  };

  /* save own list (never while viewing someone else's link) */
  let timer = null;
  /* own list -> storage + its "My lists" entry (created on the first real change) */
  function persist() {
    if (!F.state.uid) F.state.uid = KC.store.newUid();
    KC.store.writeOwn(F.state);
    const M = KC.store.mine;
    if (!KC.store.isEmpty(F.state) || M.list().some(x => x.id === M.active())) M.sync(F.state);
  }
  F.save = function () { if (F.viewingShared) return; clearTimeout(timer); timer = setTimeout(persist, 200); };
  F.saveNow = function () { if (F.viewingShared) return; clearTimeout(timer); persist(); };
  /* leave the current list (it stays in My lists) and start an empty one */
  F.startNew = function () {
    if (!F.viewingShared) F.saveNow();
    KC.store.mine.setActive("");
    const st = KC.store.blank(); st.onlyMarked = F.state.onlyMarked;
    KC.store.writeOwn(st);
    location.href = location.pathname;
  };

  /* profile: role block at the top + "About me" */
  F.renderProfile = function () {
    const top = KC.$("roleTop"), about = KC.$("aboutBody");
    top.innerHTML = ""; about.innerHTML = "";
    KC.PROFILE.forEach(f => {
      if (f.hidden) return;
      const field = KC.el("div", "field");
      field.appendChild(KC.el("div", "flabel", KC.i18n.fieldLabel(f.id)));
      const opts = KC.el("div", "opts");
      f.opts.forEach(o => {
        if (!o) return; // retired option
        const b = KC.el("button", "opt", KC.i18n.optLabel(f.id, o));
        b.type = "button"; b.dataset.field = f.id; b.dataset.val = o; b.dataset.type = f.type;
        b.setAttribute("aria-pressed", "false");
        opts.appendChild(b);
      });
      field.appendChild(opts);
      (f.top ? top : about).appendChild(field);
    });
  };

  /* practice list + section jump menu. Non-English pages show the English name as a subtitle. */
  F.renderList = function () {
    const list = KC.$("list"), jump = KC.$("jump");
    list.innerHTML = ""; jump.innerHTML = "";
    const ph = KC.el("option", null, t("jump.ph")); ph.value = ""; jump.appendChild(ph);
    const sub = KC.i18n.lang !== "en";
    let idx = 0;
    KC.CATS.forEach(cat => {
      const opt = KC.el("option", null, KC.i18n.cat(cat.id)); opt.value = "cat-" + cat.id; jump.appendChild(opt);
      const sec = KC.el("section", "cat"); sec.id = "cat-" + cat.id;
      const head = KC.el("div", "cat-head");
      head.appendChild(KC.el("h2", null, KC.i18n.cat(cat.id)));
      if (sub) head.appendChild(KC.el("span", "sub", KC.i18n.cat(cat.id, "en")));
      head.appendChild(KC.el("span", "count", "(" + cat.items.length + ")"));
      sec.appendChild(head);
      cat.items.forEach(([code, id]) => {
        const it = KC.i18n.item(id), en = sub ? KC.i18n.item(id, "en").name : "";
        const row = KC.el("div", "item"); row.dataset.id = id; row.dataset.idx = idx++; /* list order, restored after sorting */
        if (code >= KC.NEW_FROM_CODE) row.dataset.new = "1";
        row.dataset.search = (it.name + " " + en).toLowerCase();
        const name = KC.el("div", "item-name");
        if (code >= KC.NEW_FROM_CODE) { /* green dot in the left margin, level with the name */
          const dot = KC.el("span", "new-dot"); dot.title = t("item.new"); dot.setAttribute("aria-label", t("item.new"));
          name.appendChild(dot);
        }
        name.appendChild(KC.el("span", "main", it.name));
        if (sub) name.appendChild(KC.el("span", "sub", en));
        row.appendChild(name);
        const ctr = KC.el("div", "item-controls");
        const fav = KC.el("button", "mini fav", "♡"); fav.type = "button"; fav.dataset.act = "fav";
        fav.title = t("item.fav"); fav.setAttribute("aria-label", t("item.fav")); fav.setAttribute("aria-pressed", "false");
        ctr.appendChild(fav);
        if (it.desc) {
          const help = KC.el("button", "mini help", "?"); help.type = "button"; help.dataset.act = "help";
          help.setAttribute("aria-label", t("item.help")); ctr.appendChild(help);
        }
        const scale = KC.el("div", "scale");
        F.SCALE.forEach(v => { const b = KC.el("button", null, t("scale." + v)); b.type = "button"; b.dataset.v = v; scale.appendChild(b); });
        ctr.appendChild(scale); row.appendChild(ctr);
        if (it.desc) { const d = KC.el("div", "item-desc", it.desc); d.hidden = true; row.appendChild(d); }
        sec.appendChild(row);
      });
      list.appendChild(sec);
    });
  };

  /* paint F.state onto the rendered DOM */
  F.hydrate = function () {
    const st = F.state;
    const nm = KC.$("metaName"); nm.value = st.name || ""; nm.classList.toggle("bad", /[^\x00-\x7F]/.test(nm.value));
    KC.$("onlyMarked").checked = st.onlyMarked !== false;
    document.querySelectorAll(".opt").forEach(b => {
      const cur = st.meta[b.dataset.field];
      const on = b.dataset.type === "multi" ? Array.isArray(cur) && cur.indexOf(b.dataset.val) >= 0 : cur === b.dataset.val;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const favs = {}; F.favList().forEach(id => { favs[id] = 1; });
    document.querySelectorAll(".item").forEach(row => {
      const s = st.items[row.dataset.id];
      row.querySelectorAll(".scale button").forEach(b => b.classList.toggle("sel", !!s && b.dataset.v === s.interest));
      F.paintFav(row, !!favs[row.dataset.id]);
    });
    /* someone else's list: unfold "About me" if they filled it, so it is visible */
    if (F.viewingShared && KC.PROFILE.some(f => !f.top && st.meta[f.id])) KC.$("aboutSection").open = true;
    F.updateProgress();
  };

  F.updateProgress = function () {
    /* only items that exist in the list: the number always matches what goes into a link */
    /* with a template: only its items */
    let n = 0, total = 0; const set = F.tplSet();
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { if (set && !set[id]) return; total++; if (F.state.items[id] && F.state.items[id].interest) n++; }));
    KC.$("progress").textContent = t("progress", { n, total });
  };

  /* search + "Show" filter (all / unanswered / new / answered / Yes-Love-Maybe) + template + "only ♥".
     Evaluated only when one of them changes, so a row you just answered stays in place until then.
     "answered" and "positive" also sort each section by answer (Love, Yes, Maybe, No), as in the PDF. */
  const POSITIVE = { love: 1, yes: 1, maybe: 1 };
  F.applySearch = function () {
    const q = KC.$("search").value.trim().toLowerCase(), view = KC.$("view").value, set = F.tplSet();
    const favs = KC.$("onlyFav").checked ? {} : null; if (favs) F.favList().forEach(id => { favs[id] = 1; });
    const sorted = view === "answered" || view === "positive", RANK = KC.match.RANK;
    const ans = id => (F.state.items[id] || {}).interest || null;
    const rank = row => { const a = ans(row.dataset.id); return a ? RANK[a] : 4; };
    let any = false;
    document.querySelectorAll(".cat").forEach(sec => {
      let visible = 0, inTpl = 0;
      const rows = [...sec.querySelectorAll(".item")];
      rows.sort((a, b) => (sorted ? rank(a) - rank(b) : 0) || a.dataset.idx - b.dataset.idx);
      rows.forEach(row => {
        sec.appendChild(row);
        const id = row.dataset.id, a = ans(id);
        let m = !set || !!set[id]; if (m) inTpl++;
        if (m && q) m = row.dataset.search.indexOf(q) >= 0;
        if (m && view === "unanswered") m = !a;
        if (m && view === "new") m = row.dataset.new === "1";
        if (m && view === "answered") m = !!a;
        if (m && view === "positive") m = !!POSITIVE[a];
        if (m && favs) m = !!favs[id];
        row.classList.toggle("filtered-out", !m); if (m) visible++;
      });
      const cnt = sec.querySelector(".cat-head .count"); if (cnt) cnt.textContent = "(" + inTpl + ")";
      sec.classList.toggle("empty", visible === 0); if (visible) any = true;
    });
    KC.$("noresults").style.display = any ? "none" : "block";
    F.renderFiltDot();
  };

  /* template picker in the filter panel + the note above the list */
  F.renderTplUI = function () {
    const sel = KC.$("tplSel"), tp = F.tpl(), T = KC.store.tpl, lib = T.list();
    const inLib = tp && lib.some(x => x.tid === tp.id);
    const opt = (v, label) => '<option value="' + esc(v) + '">' + esc(label) + "</option>";
    const group = (key, a) => a.length ? '<optgroup label="' + esc(t(key)) + '">' + a.map(x => opt(x.tid, T.label(x) || t("unnamed"))).join("") + "</optgroup>" : "";
    sel.innerHTML = opt("", t("filt.tplNone")) + (tp && !inLib ? opt("cur", t("filt.tplCur", { name: tp.name || t("unnamed") })) : "")
      + group("filt.tplMine", T.own()) + group("filt.tplRec", T.received());
    sel.value = tp ? (inLib ? tp.id : "cur") : "";
    const note = KC.$("tplNote");
    note.hidden = !tp;
    if (tp) {
      const known = {}; KC.CATS.forEach(c => c.items.forEach(([, id]) => { known[id] = 1; }));
      KC.$("tplNoteText").innerHTML = t(F.viewingShared ? "tpl.noteShared_html" : "tpl.noteOwn_html", { name: esc(tp.name || t("unnamed")), n: tp.ids.filter(id => known[id]).length });
    }
    F.renderFiltDot();
  };
  /* dot on "Filters" while something in the panel is active (the panel may be folded) */
  F.renderFiltDot = function () {
    const on = !!F.tpl() || KC.$("onlyFav").checked;
    KC.$("filtDot").hidden = !on; KC.$("filtBtn").classList.toggle("on", on);
  };

  /* banner for a list opened from a link: says what happened with "Received" */
  F.renderBanner = function () {
    const r = F.receivedResult || {}, name = r.item && r.item.name;
    const status = r.status === "own" ? t("banner.isOwn")
      : r.status === "exists" ? (name ? t("banner.exists", { name: KC.esc(name) }) : t("banner.existsUnnamed"))
      : r.status === "updated" ? (name ? t("banner.updated", { name: KC.esc(name) }) : t("banner.updatedUnnamed"))
      : r.status === "added" ? t("banner.saved") : "";
    let html = r.status === "damaged" ? t("banner.damaged_html") : t("banner_html", { status });
    /* template link: what happened with the template */
    const lt = F.linkTpl;
    if (lt && r.status !== "damaged") {
      const ts = { added: "banner.tplSaved", exists: "banner.tplExists", updated: "banner.tplUpdated", own: "banner.tplOwn" }[lt.status];
      html += '<span class="banner-tpl">' + t("banner.tpl_html", { name: esc(lt.name || t("unnamed")), n: lt.ids.length, status: ts ? t(ts) : "" }) + "</span>";
    }
    KC.$("bannerText").innerHTML = html;
  };

  F.renderAll = function () {
    KC.i18n.apply(document);
    if (F.viewingShared) F.renderBanner();
    KC.$("compareBtn").href = "compare.html?lang=" + KC.i18n.lang;
    F.renderProfile(); F.renderList(); F.hydrate(); F.renderTplUI(); F.applySearch();
  };
})(window.KC);
