/* core/store.js — everything kept in this browser: own list, "My lists", "Received".
   State shape: { name, meta:{field:key|[keys]}, items:{id:{interest}}, onlyMarked,
                  safeword, fantasies, comments, allergies } */
(function (KC) {
  const VALID = { limit: 1, maybe: 1, yes: 1, love: 1 };

  const S = KC.store = {
    blank() { return { name: "", meta: {}, items: {}, onlyMarked: true, safeword: "", fantasies: "", comments: "", allergies: "" }; },

    /* clean anything (old versions, decoded links) into the current shape */
    normalize(src) {
      const st = S.blank(); src = src && typeof src === "object" ? src : {};
      ["name", "safeword", "fantasies", "comments", "allergies"].forEach(k => { if (typeof src[k] === "string") st[k] = src[k]; });
      if (src.onlyMarked === false) st.onlyMarked = false;
      st.meta = KC.normalizeMeta(src.meta);
      const items = src.items || {};
      Object.keys(items).forEach(id => { const v = items[id] && items[id].interest; if (VALID[v]) st.items[id] = { interest: v }; });
      return st;
    },
    clone: st => JSON.parse(JSON.stringify(st)),

    /* own current list */
    loadOwn()   { return S.normalize(KC.ls.get(KC.KEYS.state, null)); },
    hasOwn()    { return KC.ls.raw(KC.KEYS.state) != null; },
    writeOwn(st){ KC.ls.set(KC.KEYS.state, st); },
    clearOwn()  { KC.ls.del(KC.KEYS.state); },
    ownCode()   { return S.hasOwn() ? KC.codec.encode(S.loadOwn()) : ""; },

    /* received lists: [{id, name, code, ts}] */
    received: {
      list()   { return KC.ls.get(KC.KEYS.saved, []) || []; },
      write(a) { KC.ls.set(KC.KEYS.saved, a); },
      add(code, name) {
        if (!code) return;
        const k = KC.codec.key(code);
        if (S.hasOwn() && k === KC.codec.key(S.ownCode())) return;
        const a = this.list(); if (a.some(x => KC.codec.key(x.code) === k)) return;
        a.unshift({ id: "p" + Date.now(), name: (name || "").trim(), code, ts: Date.now() });
        if (a.length > 60) a.length = 60; this.write(a);
      },
    },

    /* my lists: [{id, name, data:state, ts}] — full copy, nothing lost */
    mine: {
      list()   { return KC.ls.get(KC.KEYS.mine, []) || []; },
      write(a) { KC.ls.set(KC.KEYS.mine, a); },
    },
  };
})(window.KC);
