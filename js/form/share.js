/* form/share.js — "Share": link + QR. The link carries the current page language (lg=). */
(function (KC) {
  const F = KC.form, t = k => KC.i18n.t(k);
  const modal = KC.modal("overlay", "overlayClose");

  F.shareLink = () => {
    if (!F.viewingShared && !F.state.uid) F.saveNow(); /* gives the list its id */
    return location.origin + location.pathname + "#" + KC.codec.encode(F.state, KC.i18n.lang);
  };

  KC.$("shareBtn").addEventListener("click", () => {
    const link = F.shareLink();
    KC.$("shareLink").value = link;
    const qr = KC.$("qr"); qr.innerHTML = "";
    try { new QRCode(qr, { text: link, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M }); }
    catch (e) { qr.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center">' + KC.esc(t("share.qrTooLong")) + "</div>"; }
    modal.open();
  });

  KC.$("copyLink").addEventListener("click", async () => {
    const inp = KC.$("shareLink"); inp.select(); inp.setSelectionRange(0, 99999);
    try { await navigator.clipboard.writeText(inp.value); KC.toast(t("toast.copied")); }
    catch (e) { try { document.execCommand("copy"); KC.toast(t("toast.copied")); } catch (_) { KC.toast(t("toast.copyManual")); } }
  });
})(window.KC);
