/* form/library.js — the two device-local lists: "Received" (other people's links)
   and "My lists" (several own lists, stored in full). Also the hand-off to compare.html. */
(function (KC) {
  const F = KC.form, t = k => KC.i18n.t(k), R = KC.store.received, M = KC.store.mine;

  const fmtDate = ts => { const d = new Date(ts), L = KC.i18n.locale(); return d.toLocaleDateString(L) + " " + d.toLocaleTimeString(L, { hour: "2-digit", minute: "2-digit" }); };

  /* open compare.html with both codes pre-filled */
  F.startCompare = function (aCode, bCode, aName, bName) {
    try {
      sessionStorage.setItem("cmpA", aCode || ""); sessionStorage.setItem("cmpB", bCode || "");
      sessionStorage.setItem("cmpAName", aName || ""); sessionStorage.setItem("cmpBName", bName || "");
    } catch (e) {}
    location.href = "compare.html?lang=" + KC.i18n.lang;
  };

  function rows(list, acts) {
    return list.map(x => '<div class="saved-row" data-id="' + KC.esc(x.id) + '"><div class="meta"><b>' + KC.esc(x.name || t("unnamed")) + "</b><span>" + fmtDate(x.ts) + "</span></div>"
      + '<div class="acts">' + acts.map(a => '<button class="btn ghost mini" data-act="' + a + '"' + (a === "del" ? ' title="' + KC.esc(t("act.delete")) + '">✕' : ">" + KC.esc(t("act." + a))) + "</button>").join("") + "</div></div>").join("");
  }
  const empty = key => '<div style="color:var(--muted);font-size:13px;padding:8px 0">' + KC.esc(t(key)) + "</div>";
  const rename = (item, save) => { const nn = prompt(t("prompt.listName"), item.name || ""); if (nn !== null) { item.name = nn.trim(); save(); } };

  /* ---- Received ---- */
  const recModal = KC.modal("savedOverlay", "savedClose");
  function drawReceived() { const a = R.list(); KC.$("savedList").innerHTML = a.length ? rows(a, ["open", "rename", "compare", "del"]) : empty("saved.empty"); }
  KC.$("savedBtn").addEventListener("click", () => { drawReceived(); recModal.open(); });
  KC.$("savedList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]"); if (!btn) return;
    const id = btn.closest(".saved-row").dataset.id, a = R.list(), item = a.find(x => x.id === id); if (!item) return;
    switch (btn.dataset.act) {
      case "open": location.hash = KC.codec.extract(item.code); location.reload(); break;
      case "rename": rename(item, () => { R.write(a); drawReceived(); }); break;
      case "compare": F.startCompare(KC.store.ownCode(), item.code, t("label.mine"), item.name || t("label.received")); break;
      case "del": R.write(a.filter(x => x.id !== id)); drawReceived(); break;
    }
  });

  /* ---- My lists ---- */
  const mineModal = KC.modal("mineOverlay", "mineClose");
  function drawMine() { const a = M.list(); KC.$("mineList").innerHTML = a.length ? rows(a, ["load", "update", "rename", "del"]) : empty("mine.empty"); }
  KC.$("mineBtn").addEventListener("click", () => { drawMine(); mineModal.open(); });
  KC.$("mineSaveNew").addEventListener("click", () => {
    const nm = prompt(t("prompt.listName"), F.state.name || ""); if (nm === null) return;
    const a = M.list(); a.unshift({ id: "m" + Date.now(), name: nm.trim(), data: KC.store.clone(F.state), ts: Date.now() });
    M.write(a); drawMine(); KC.toast(t("toast.saved"));
  });
  KC.$("mineList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]"); if (!btn) return;
    const id = btn.closest(".saved-row").dataset.id, a = M.list(), item = a.find(x => x.id === id); if (!item) return;
    switch (btn.dataset.act) {
      case "load": {
        const st = KC.store.normalize(item.data); st.onlyMarked = F.state.onlyMarked;
        KC.store.writeOwn(st); location.href = location.pathname; break;
      }
      case "update": item.data = KC.store.clone(F.state); item.ts = Date.now(); M.write(a); drawMine(); KC.toast(t("toast.updated")); break;
      case "rename": rename(item, () => { M.write(a); drawMine(); }); break;
      case "del": M.write(a.filter(x => x.id !== id)); drawMine(); break;
    }
  });
})(window.KC);
