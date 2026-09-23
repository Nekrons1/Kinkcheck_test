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
    /* nothing filled in at all */
    isEmpty: st => !st.name && !Object.keys(st.items).length && !Object.keys(st.meta).length && !st.safeword && !st.fantasies && !st.comments && !st.allergies,

    /* own current list */
    loadOwn()   { return S.normalize(KC.ls.get(KC.KEYS.state, null)); },
    hasOwn()    { return KC.ls.raw(KC.KEYS.state) != null; },
    writeOwn(st){ KC.ls.set(KC.KEYS.state, st); },
    clearOwn()  { KC.ls.del(KC.KEYS.state); },
    ownCode()   { return S.hasOwn() ? KC.codec.encode(S.loadOwn()) : ""; },

    /* received lists: [{id, name, code, ts}] */
    received: {
      /* also merges duplicates left by older versions: keeps the earliest entry,
         taking a custom name from a duplicate if the kept one has none */
      list() {
        const a = KC.ls.get(KC.KEYS.saved, []) || [];
        const byKey = {}, out = [];
        a.slice().sort((x, y) => (x.ts || 0) - (y.ts || 0)).forEach(x => {
          let k; try { k = KC.codec.key(x.code); } catch (e) { k = x.code; }
          const first = byKey[k];
          if (!first) { byKey[k] = x; out.push(x); }
          else if (!first.name && x.name) first.name = x.name;
        });
        if (out.length !== a.length) {
          const keep = a.filter(x => out.indexOf(x) >= 0); // original order (newest first)
          this.write(keep); return keep;
        }
        return a;
      },
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

    /* my lists: [{id, name, data:state, ts}] — full copies, nothing lost.
       The own list is auto-saved into the "active" entry (KC.KEYS.active):
         key absent = never set (older version) | "" = new list not saved yet | id */
    mine: {
      list()   { return KC.ls.get(KC.KEYS.mine, []) || []; },
      write(a) { KC.ls.set(KC.KEYS.mine, a); },
      active()      { return KC.ls.raw(KC.KEYS.active); },
      setActive(id) { KC.ls.setRaw(KC.KEYS.active, id || ""); },
      /* copy st into the active entry, creating it if needed */
      sync(st) {
        const a = this.list(); let id = this.active(); let item = id && a.find(x => x.id === id);
        if (!item) { id = "m" + Date.now(); item = { id, name: "", data: null, ts: 0 }; a.unshift(item); this.setActive(id); }
        item.data = S.clone(st); item.ts = Date.now(); this.write(a); return id;
      },
      /* display name: own label, else the name inside the list */
      label(x) { return x.name || (x.data && x.data.name) || ""; },
    },
  };
})(window.KC);
