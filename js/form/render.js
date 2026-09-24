/* form/render.js — builds the form DOM from data + current language, and paints state onto it.
   Everything here can be re-run at any time (language switch calls F.renderAll()). */
(function (KC) {
  const F = KC.form = { state: KC.store.blank(), viewingShared: false };
  const t = (k, v) => KC.i18n.t(k, v);
  F.SCALE = ["limit", "maybe", "yes", "love"];

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
        const row = KC.el("div", "item"); row.dataset.id = id;
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
    document.querySelectorAll(".item").forEach(row => {
      const s = st.items[row.dataset.id];
      row.querySelectorAll(".scale button").forEach(b => b.classList.toggle("sel", !!s && b.dataset.v === s.interest));
    });
    /* someone else's list: unfold "About me" if they filled it, so it is visible */
    if (F.viewingShared && KC.PROFILE.some(f => !f.top && st.meta[f.id])) KC.$("aboutSection").open = true;
    F.updateProgress();
  };

  F.updateProgress = function () {
    /* only items that exist in the list: the number always matches what goes into a link */
    let n = 0, total = 0;
    KC.CATS.forEach(c => c.items.forEach(([, id]) => { total++; if (F.state.items[id] && F.state.items[id].interest) n++; }));
    KC.$("progress").textContent = t("progress", { n, total });
  };

  /* search + "Show" filter (all / unanswered / new). Evaluated only when search or filter changes,
     so a row you just answered stays in place until then. */
  F.applySearch = function () {
    const q = KC.$("search").value.trim().toLowerCase(), view = KC.$("view").value; let any = false;
    document.querySelectorAll(".cat").forEach(sec => {
      let visible = 0;
      sec.querySelectorAll(".item").forEach(row => {
        let m = !q || row.dataset.search.indexOf(q) >= 0;
        if (m && view === "unanswered") m = !F.state.items[row.dataset.id];
        if (m && view === "new") m = row.dataset.new === "1";
        row.classList.toggle("filtered-out", !m); if (m) visible++;
      });
      sec.classList.toggle("empty", visible === 0); if (visible) any = true;
    });
    KC.$("noresults").style.display = any ? "none" : "block";
  };

  /* banner for a list opened from a link: says what happened with "Received" */
  F.renderBanner = function () {
    const r = F.receivedResult || {}, name = r.item && r.item.name;
    const status = r.status === "own" ? t("banner.isOwn")
      : r.status === "exists" ? (name ? t("banner.exists", { name: KC.esc(name) }) : t("banner.existsUnnamed"))
      : r.status === "updated" ? (name ? t("banner.updated", { name: KC.esc(name) }) : t("banner.updatedUnnamed"))
      : r.status === "added" ? t("banner.saved") : "";
    KC.$("bannerText").innerHTML = r.status === "damaged" ? t("banner.damaged_html") : t("banner_html", { status });
  };

  F.renderAll = function () {
    KC.i18n.apply(document);
    if (F.viewingShared) F.renderBanner();
    KC.$("compareBtn").href = "compare.html?lang=" + KC.i18n.lang;
    F.renderProfile(); F.renderList(); F.hydrate(); F.applySearch();
  };
})(window.KC);
