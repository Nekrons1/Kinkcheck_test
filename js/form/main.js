/* form/main.js — start-up of index.html: pick the list (link or own), pick the language,
   render, and wire the "opened from a link" banner. Loaded last. */
(function (KC) {
  const F = KC.form, t = k => KC.i18n.t(k);
  KC.initTheme();

  /* 1. whose list: someone's link (#...) or my own saved one */
  let linkLang = null;
  const hash = location.hash.replace(/^#/, "");
  if (hash) {
    const d = KC.codec.decode(hash);
    linkLang = d.lang;
    F.linkDamaged = !!d.damaged;
    F.state = KC.store.normalize(d);
    F.viewingShared = true;
    /* template link: the answered items are the template; the list is shown through it */
    if (d.tpl && !d.damaged) {
      F.linkTpl = { id: d.tpl.id, name: d.tpl.name, ids: KC.store.answeredIds(F.state) };
      if (F.linkTpl.ids.length) F.viewTpl = { id: F.linkTpl.id, name: F.linkTpl.name, ids: F.linkTpl.ids.slice() }; else F.linkTpl = null;
    }
    F.sharedCode = KC.codec.encode(F.linkTpl ? Object.assign({}, F.state, { tpl: d.tpl }) : F.state, linkLang);
    /* favourites of this list live on this device under its id (or its content) */
    if (!d.damaged) F.favKey = KC.store.favs.keyOf(F.sharedCode);
    history.replaceState(null, "", location.pathname + location.search);
  } else {
    F.state = KC.store.loadOwn();
    /* first run after update: an existing filled-in list goes into My lists */
    if (KC.store.mine.active() === null && !KC.store.isEmpty(F.state)) KC.store.mine.sync(F.state);
    /* lists from before list ids existed get one now */
    if (!F.state.uid && !KC.store.isEmpty(F.state)) F.saveNow();
  }

  /* a link pasted into an already open tab only changes the #part: the browser does not
     reload, so nothing would happen. Reload to open it properly. */
  window.addEventListener("hashchange", () => { if (location.hash.length > 1) location.reload(); });

  /* 2. language: link's language wins, then saved choice, then browser */
  KC.i18n.set(KC.i18n.detect(linkLang));
  KC.i18n.mountSwitcher(() => F.renderAll());

  /* 3. draw */
  F.renderAll();
  /* answers to items that no longer exist (removed from the list): not shown, not in links */
  const known = {}; KC.CATS.forEach(c => c.items.forEach(([, id]) => known[id] = 1));
  const orphan = Object.keys(F.state.items).filter(id => !known[id]);
  if (orphan.length) console.info("[kinkcheck] answers to removed items (not shown, not shared):", orphan);
  /* stale language file on the server shows up here (items fall back to English) */
  const miss = KC.i18n.missing();
  if (miss.length) console.warn("[kinkcheck] js/lang/" + KC.i18n.lang + ".practices.js lacks " + miss.length + " items (outdated file?):", miss);

  /* 4. opened from a link: remember it under "Received", show banner */
  if (F.viewingShared) {
    /* a damaged link shows wrong answers: warn, never store it */
    F.receivedResult = F.linkDamaged ? { status: "damaged" } : KC.store.received.add(F.sharedCode, F.state.name);
    /* the template goes to "Received → Templates" */
    if (F.linkTpl) { F.linkTpl.status = KC.store.tpl.addReceived(F.linkTpl.id, F.linkTpl.name, F.linkTpl.ids).status; F.renderTplUI(); }
    F.renderBanner();
    KC.$("sharedBanner").style.display = "block";
    KC.$("bannerTplFill").hidden = !F.linkTpl;
    if (F.linkDamaged) { ["bannerCmp", "bannerKeep", "bannerSaveAs", "bannerTpl"].forEach(id => KC.$(id).hidden = true); KC.$("sharedBanner").classList.add("damaged"); }
  }
  KC.$("bannerOwn").addEventListener("click", () => { location.href = location.pathname; });
  KC.$("bannerKeep").addEventListener("click", () => {
    /* becomes a new own list; the previous one stays in My lists */
    /* favourites made while viewing it and the template it is viewed through come along */
    const favs = F.favList(), tp = F.viewTpl;
    F.viewingShared = false; KC.$("sharedBanner").style.display = "none";
    if (favs.length) F.state.fav = favs;
    if (tp) F.state.template = tp;
    KC.store.mine.setActive(""); F.state.uid = KC.store.newUid(); F.saveNow(); KC.toast(t("toast.keep"));
    F.renderTplUI(); F.applySearch(); F.updateProgress();
  });
  /* template link: fill my own list by this template (my answers stay) */
  KC.$("bannerTplFill").addEventListener("click", () => { if (F.linkTpl) F.fillByTpl({ id: F.linkTpl.id, name: F.linkTpl.name, ids: F.linkTpl.ids.slice() }); });
  /* someone's list through one of my templates: open the filter panel with the template picker */
  KC.$("bannerTpl").addEventListener("click", () => {
    F.toggleFilters(true);
    const sel = KC.$("tplSel");
    if (sel.options.length <= 1) KC.toast(t("toast.noTpl"));
    try { sel.focus(); sel.scrollIntoView({ block: "nearest" }); } catch (e) {}
  });
  KC.$("bannerSaveAs").addEventListener("click", () => {
    const nm = prompt(t("prompt.listName"), F.state.name || ""); if (nm === null) return;
    const item = KC.store.received.saveAs(F.sharedCode, nm);
    F.receivedResult = { status: "exists", item }; F.renderBanner();
    KC.toast(KC.i18n.t("toast.savedAs", { name: item.name || t("unnamed") }));
  });
  KC.$("bannerCmp").addEventListener("click", () => {
    F.startCompare(KC.store.ownCode(), KC.codec.encode(F.shown(), KC.i18n.lang), t("label.mine"), F.state.name || t("label.this"));
  });
})(window.KC);
