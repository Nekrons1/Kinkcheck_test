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
    F.sharedCode = KC.codec.encode(F.state, linkLang);
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
    F.renderBanner();
    KC.$("sharedBanner").style.display = "block";
    if (F.linkDamaged) { ["bannerCmp", "bannerKeep", "bannerSaveAs"].forEach(id => KC.$(id).hidden = true); KC.$("sharedBanner").classList.add("damaged"); }
  }
  KC.$("bannerOwn").addEventListener("click", () => { location.href = location.pathname; });
  KC.$("bannerKeep").addEventListener("click", () => {
    /* becomes a new own list; the previous one stays in My lists */
    F.viewingShared = false; KC.$("sharedBanner").style.display = "none";
    KC.store.mine.setActive(""); F.state.uid = KC.store.newUid(); F.saveNow(); KC.toast(t("toast.keep"));
  });
  KC.$("bannerSaveAs").addEventListener("click", () => {
    const nm = prompt(t("prompt.listName"), F.state.name || ""); if (nm === null) return;
    const item = KC.store.received.saveAs(F.sharedCode, nm);
    F.receivedResult = { status: "exists", item }; F.renderBanner();
    KC.toast(KC.i18n.t("toast.savedAs", { name: item.name || t("unnamed") }));
  });
  KC.$("bannerCmp").addEventListener("click", () => {
    F.startCompare(KC.store.ownCode(), KC.codec.encode(F.state, KC.i18n.lang), t("label.mine"), F.state.name || t("label.this"));
  });
})(window.KC);
