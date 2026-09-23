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

  /* acts: array, or function(item) -> array; label: function(item) -> name */
  function rows(list, acts, label, badge) {
    return list.map(x => '<div class="saved-row' + (badge && badge(x) ? " current" : "") + '" data-id="' + KC.esc(x.id) + '"><div class="meta"><b>' + KC.esc(label(x) || t("unnamed")) + "</b>"
      + (badge && badge(x) ? '<span class="cur-badge">' + KC.esc(t("mine.current")) + "</span>" : "") + "<span>" + fmtDate(x.ts) + "</span></div>"
      + '<div class="acts">' + (typeof acts === "function" ? acts(x) : acts).map(a => '<button class="btn ghost mini" data-act="' + a + '"' + (a === "del" ? ' title="' + KC.esc(t("act.delete")) + '">✕' : ">" + KC.esc(t("act." + a))) + "</button>").join("") + "</div></div>").join("");
  }
  const empty = key => '<div style="color:var(--muted);font-size:13px;padding:8px 0">' + KC.esc(t(key)) + "</div>";
  const rename = (item, save, cur) => { const nn = prompt(t("prompt.listName"), cur || ""); if (nn !== null) { item.name = nn.trim(); save(); } };

  /* ---- Received ---- */
  const recModal = KC.modal("savedOverlay", "savedClose");
  function drawReceived() { const a = R.list(); KC.$("savedList").innerHTML = a.length ? rows(a, ["open", "rename", "compare", "del"], x => x.name) : empty("saved.empty"); }
  KC.$("savedBtn").addEventListener("click", () => { drawReceived(); recModal.open(); });
  KC.$("savedList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]"); if (!btn) return;
    const id = btn.closest(".saved-row").dataset.id, a = R.list(), item = a.find(x => x.id === id); if (!item) return;
    switch (btn.dataset.act) {
      case "open": location.hash = KC.codec.extract(item.code); location.reload(); break;
      case "rename": rename(item, () => { R.write(a); drawReceived(); }, item.name); break;
      case "compare": F.startCompare(KC.store.ownCode(), item.code, t("label.mine"), item.name || t("label.received")); break;
      case "del": R.write(a.filter(x => x.id !== id)); drawReceived(); break;
    }
  });

  /* ---- My lists ---- */
  const mineModal = KC.modal("mineOverlay", "mineClose");
  const isCurrent = x => !F.viewingShared && x.id === M.active();
  function drawMine() {
    const a = M.list();
    KC.$("mineList").innerHTML = a.length ? rows(a, x => isCurrent(x) ? ["rename", "del"] : ["load", "rename", "del"], M.label, isCurrent) : empty("mine.empty");
  }
  KC.$("mineBtn").addEventListener("click", () => { F.saveNow(); drawMine(); mineModal.open(); });
  KC.$("mineNew").addEventListener("click", () => F.startNew());
  KC.$("mineSaveNew").addEventListener("click", () => {
    const nm = prompt(t("prompt.listName"), F.state.name || ""); if (nm === null) return;
    const copy = KC.store.clone(F.state); copy.uid = KC.store.newUid(); /* a copy is a separate list */
    const a = M.list(); a.unshift({ id: "m" + Date.now(), name: nm.trim(), data: copy, ts: Date.now() });
    M.write(a); drawMine(); KC.toast(t("toast.saved"));
  });
  /* backup to / restore from a file */
  KC.$("backupSave").addEventListener("click", () => {
    F.saveNow();
    const blob = new Blob([JSON.stringify(KC.store.exportAll(), null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "kinkcheck-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    KC.toast(t("toast.backupSaved"));
  });
  KC.$("backupLoad").addEventListener("click", () => KC.$("backupFile").click());
  KC.$("backupFile").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let res = null; try { res = KC.store.importAll(JSON.parse(r.result)); } catch (err) {}
      e.target.value = "";
      if (!res) { KC.toast(t("toast.backupBad")); return; }
      KC.toast(KC.i18n.t("toast.backupLoaded", res));
      setTimeout(() => { location.href = location.pathname; }, 900);
    };
    r.readAsText(f);
  });

  KC.$("mineList").addEventListener("click", e => {
    const btn = e.target.closest("button[data-act]"); if (!btn) return;
    const id = btn.closest(".saved-row").dataset.id, a = M.list(), item = a.find(x => x.id === id); if (!item) return;
    switch (btn.dataset.act) {
      case "load": {
        F.saveNow(); // current list is safe in its own entry
        const st = KC.store.normalize(item.data); st.onlyMarked = F.state.onlyMarked;
        KC.store.writeOwn(st); M.setActive(item.id); location.href = location.pathname; break;
      }
      case "rename": rename(item, () => { M.write(a); drawMine(); }, M.label(item)); break;
      case "del": M.write(a.filter(x => x.id !== id)); if (id === M.active()) M.setActive(""); drawMine(); break;
    }
  });
})(window.KC);
