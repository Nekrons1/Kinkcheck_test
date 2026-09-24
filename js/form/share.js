/* form/share.js — "Share": link + QR. The link carries the current page language (lg=).
   A list filled by (or viewed through) a template gives only the template's answers.
   "Share as template": the answered items become the template; the same link also carries the
   sender's answers to them, so the recipient gets both the template and the sender's list. */
(function (KC) {
  const F = KC.form, t = (k, v) => KC.i18n.t(k, v), T = KC.store.tpl;
  const modal = KC.modal("overlay", "overlayClose");
  const base = () => location.origin + location.pathname + "#";

  F.shareLink = () => {
    if (!F.viewingShared && !F.state.uid) F.saveNow(); /* gives the list its id */
    return base() + KC.codec.encode(F.shown(), KC.i18n.lang);
  };
  /* ids of a template made from this list: answered items (inside the current template, if any) */
  F.templateIds = () => KC.store.answeredIds(F.state, F.tpl() && F.tpl().ids);
  /* -> {link, ids, tid} or null when nothing is answered */
  F.templateLink = function (name) {
    if (!F.viewingShared && !F.state.uid) F.saveNow();
    const ids = F.templateIds(); if (!ids.length) return null;
    const st = KC.store.trim(F.state, ids), tid = T.tidFor(F.state.uid, name);
    st.tpl = { id: tid, name: name.trim() };
    return { link: base() + KC.codec.encode(st, KC.i18n.lang), ids, tid };
  };

  function show(link, kind) {
    KC.$("shareLink").value = link;
    KC.$("shareKind").textContent = kind;
    const qr = KC.$("qr"); qr.innerHTML = "";
    try { new QRCode(qr, { text: link, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M }); }
    catch (e) { qr.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center">' + KC.esc(t("share.qrTooLong")) + "</div>"; }
  }
  function showList() {
    show(F.shareLink(), t("share.kindList"));
    KC.$("shareBack").hidden = true;
  }

  KC.$("shareBtn").addEventListener("click", () => {
    const tp = F.tpl(), note = KC.$("shareTplNote");
    note.hidden = !tp;
    if (tp) note.textContent = t("share.tplNote", { name: tp.name || t("unnamed"), n: tp.ids.length });
    /* templates are made from your own list */
    KC.$("tplShare").hidden = F.viewingShared;
    KC.$("tplName").classList.remove("bad");
    showList();
    modal.open();
  });

  /* the template name is required for both buttons */
  function askName() {
    const inp = KC.$("tplName"), nm = inp.value.trim();
    inp.classList.toggle("bad", !nm);
    if (!nm) { KC.toast(t("tplShare.needName")); inp.focus(); return null; }
    if (!F.templateIds().length) { KC.toast(t("tplShare.empty")); return null; }
    return nm;
  }
  KC.$("tplName").addEventListener("input", e => { if (e.target.value.trim()) e.target.classList.remove("bad"); });
  KC.$("tplShareBtn").addEventListener("click", () => {
    const nm = askName(); if (!nm) return;
    const r = F.templateLink(nm);
    show(r.link, t("share.kindTpl", { name: nm, n: r.ids.length }));
    KC.$("shareBack").hidden = false;
  });
  KC.$("tplSaveBtn").addEventListener("click", () => {
    const nm = askName(); if (!nm) return;
    if (!F.state.uid) F.saveNow();
    const ids = F.templateIds(), res = T.saveOwn(nm, ids, T.tidFor(F.state.uid, nm));
    KC.toast(t(res.status === "updated" ? "toast.tplUpdated" : "toast.tplSaved", { name: nm, n: ids.length }));
    F.renderTplUI();
  });
  KC.$("shareBack").addEventListener("click", showList);

  KC.$("copyLink").addEventListener("click", async () => {
    const inp = KC.$("shareLink"); inp.select(); inp.setSelectionRange(0, 99999);
    try { await navigator.clipboard.writeText(inp.value); KC.toast(t("toast.copied")); }
    catch (e) { try { document.execCommand("copy"); KC.toast(t("toast.copied")); } catch (_) { KC.toast(t("toast.copyManual")); } }
  });
})(window.KC);
