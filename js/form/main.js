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
    F.state = KC.store.normalize(d);
    F.viewingShared = true;
    F.sharedCode = KC.codec.encode(F.state, linkLang);
    history.replaceState(null, "", location.pathname + location.search);
  } else {
    F.state = KC.store.loadOwn();
    /* first run after update: an existing filled-in list goes into My lists */
    if (KC.store.mine.active() === null && !KC.store.isEmpty(F.state)) KC.store.mine.sync(F.state);
  }

  /* 2. language: link's language wins, then saved choice, then browser */
  KC.i18n.set(KC.i18n.detect(linkLang));
  KC.i18n.mountSwitcher(() => F.renderAll());

  /* 3. draw */
  F.renderAll();
  /* stale language file on the server shows up here (items fall back to English) */
  const miss = KC.i18n.missing();
  if (miss.length) console.warn("[kinkcheck] js/lang/" + KC.i18n.lang + ".practices.js lacks " + miss.length + " items (outdated file?):", miss);

  /* 4. opened from a link: remember it under "Received", show banner */
  if (F.viewingShared) {
    KC.store.received.add(F.sharedCode, F.state.name);
    KC.$("sharedBanner").style.display = "block";
  }
  KC.$("bannerOwn").addEventListener("click", () => { location.href = location.pathname; });
  KC.$("bannerKeep").addEventListener("click", () => {
    /* becomes a new own list; the previous one stays in My lists */
    F.viewingShared = false; KC.$("sharedBanner").style.display = "none";
    KC.store.mine.setActive(""); F.saveNow(); KC.toast(t("toast.keep"));
  });
  KC.$("bannerCmp").addEventListener("click", () => {
    F.startCompare(KC.store.ownCode(), KC.codec.encode(F.state, KC.i18n.lang), t("label.mine"), F.state.name || t("label.this"));
  });
})(window.KC);
