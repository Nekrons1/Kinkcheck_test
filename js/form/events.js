/* form/events.js — user input on the form. Handlers are attached once to stable containers,
   so re-rendering (language switch) never needs re-wiring. */
(function (KC) {
  const F = KC.form;

  /* answer buttons + "?" hints */
  KC.$("list").addEventListener("click", e => {
    const btn = e.target.closest("button"); const row = e.target.closest(".item"); if (!btn || !row) return;
    if (btn.dataset.act === "help") {
      const d = row.querySelector(".item-desc"); if (d) { d.hidden = !d.hidden; btn.classList.toggle("on", !d.hidden); }
      return;
    }
    const v = btn.dataset.v; if (!v) return;
    const id = row.dataset.id, cur = F.state.items[id] && F.state.items[id].interest;
    if (cur === v) delete F.state.items[id]; else F.state.items[id] = { interest: v };
    row.querySelectorAll(".scale button").forEach(b => b.classList.toggle("sel", b.dataset.v === v && cur !== v));
    F.save(); F.updateProgress();
  });

  /* profile options (role block + About me) */
  function optClick(e) {
    const b = e.target.closest(".opt"); if (!b) return;
    const f = b.dataset.field, v = b.dataset.val, meta = F.state.meta;
    if (b.dataset.type === "multi") {
      let arr = Array.isArray(meta[f]) ? meta[f].slice() : [];
      arr = arr.indexOf(v) >= 0 ? arr.filter(x => x !== v) : arr.concat(v);
      if (arr.length) meta[f] = arr; else delete meta[f];
      b.setAttribute("aria-pressed", arr.indexOf(v) >= 0 ? "true" : "false");
    } else {
      if (meta[f] === v) { delete meta[f]; b.setAttribute("aria-pressed", "false"); }
      else {
        meta[f] = v;
        document.querySelectorAll('.opt[data-field="' + f + '"]').forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      }
    }
    F.save();
  }
  ["roleTop", "aboutBody"].forEach(id => KC.$(id).addEventListener("click", optClick));

  /* name: any characters allowed; non-Latin only gets a soft red hint (link gets longer) */
  const nm = KC.$("metaName");
  nm.addEventListener("input", () => { nm.classList.toggle("bad", /[^\x00-\x7F]/.test(nm.value)); F.state.name = nm.value; F.save(); });

  KC.$("onlyMarked").addEventListener("change", e => { F.state.onlyMarked = e.target.checked; F.save(); });
  KC.$("search").addEventListener("input", F.applySearch);
  KC.$("jump").addEventListener("change", e => {
    const el = e.target.value && KC.$(e.target.value); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); e.target.value = "";
  });

  KC.$("resetBtn").addEventListener("click", () => {
    if (!confirm(KC.i18n.t("confirm.reset"))) return;
    if (F.viewingShared) { F.state = KC.store.blank(); KC.$("search").value = ""; F.renderAll(); KC.toast(KC.i18n.t("toast.cleared")); return; }
    F.startNew(); /* current list stays in My lists */
  });
})(window.KC);
