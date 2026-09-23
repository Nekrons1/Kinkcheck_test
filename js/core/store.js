/* core/store.js — everything kept in this browser: own list, "My lists", "Received".
   State shape: { name, meta:{field:key|[keys]}, items:{id:{interest}}, onlyMarked,
                  safeword, fantasies, comments, allergies } */
(function (KC) {
  const VALID = { limit: 1, maybe: 1, yes: 1, love: 1 };

  const S = KC.store = {
    /* 6 random url-safe characters: the list's own id inside links */
    newUid() {
      const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", b = new Uint8Array(6);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256);
      return Array.from(b, x => A[x & 63]).join("");
    },
    blank() { return { name: "", meta: {}, items: {}, onlyMarked: true, safeword: "", fantasies: "", comments: "", allergies: "" }; },

    /* clean anything (old versions, decoded links) into the current shape */
    normalize(src) {
      const st = S.blank(); src = src && typeof src === "object" ? src : {};
      ["name", "safeword", "fantasies", "comments", "allergies"].forEach(k => { if (typeof src[k] === "string") st[k] = src[k]; });
      if (src.onlyMarked === false) st.onlyMarked = false;
      if (typeof src.uid === "string" && /^[A-Za-z0-9_-]{6}$/.test(src.uid)) st.uid = src.uid;
      st.meta = KC.normalizeMeta(src.meta);
      const items = src.items || {}, AL = KC.ID_ALIASES || {};
      Object.keys(items).forEach(id => { const v = items[id] && items[id].interest; if (VALID[v] && !AL[id]) st.items[id] = { interest: v }; });
      /* answers saved under ids of the earliest versions go to the current item (current answer wins) */
      Object.keys(items).forEach(id => { const v = items[id] && items[id].interest; const to = AL[id]; if (to && VALID[v] && !st.items[to]) st.items[to] = { interest: v }; });
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
          if (x.manual) { out.push(x); return; } /* saved on purpose via "Save as": never merged */
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
      /* -> {status: "added" | "exists" (moved to top) | "updated" (newer version of the same list) | "own", item} */
      add(code, name) {
        if (!code) return { status: "none" };
        const k = KC.codec.key(code), uid = KC.codec.decode(code).uid;
        const mine = S.mine.list(), own = S.hasOwn() ? S.loadOwn() : null;
        if (uid && ((own && own.uid === uid) || mine.some(x => x.data && x.data.uid === uid))) return { status: "own" };
        const mineKeys = mine.map(x => { try { return KC.codec.key(KC.codec.encode(S.normalize(x.data))); } catch (e) { return ""; } });
        if ((own && k === KC.codec.key(KC.codec.encode(own))) || mineKeys.indexOf(k) >= 0) return { status: "own" };
        const a = this.list(); let i = a.findIndex(x => !x.manual && KC.codec.key(x.code) === k);
        if (i >= 0) { const item = a.splice(i, 1)[0]; item.ts = Date.now(); a.unshift(item); this.write(a); return { status: "exists", item }; }
        if (uid) {
          i = a.findIndex(x => !x.manual && KC.codec.decode(x.code).uid === uid);
          if (i >= 0) { const item = a.splice(i, 1)[0]; item.code = code; item.ts = Date.now(); a.unshift(item); this.write(a); return { status: "updated", item }; }
        }
        const item = { id: "p" + Date.now(), name: (name || "").trim(), code, ts: Date.now() };
        a.unshift(item); if (a.length > 60) a.length = 60; this.write(a);
        return { status: "added", item };
      },
      /* "Save as…": always a new entry with the given name, even if the same content exists */
      saveAs(code, name) {
        const a = this.list();
        const item = { id: "p" + Date.now(), name: (name || "").trim(), code, ts: Date.now(), manual: true };
        a.unshift(item); if (a.length > 60) a.length = 60; this.write(a);
        return item;
      },
    },

    /* backup of everything on this device -> plain object (saved as a .json file) */
    exportAll() {
      return { app: "kinkcheck", v: 1, ts: Date.now(), own: KC.ls.get(KC.KEYS.state, null), active: S.mine.active(),
        mine: S.mine.list(), received: KC.ls.get(KC.KEYS.saved, []) || [] };
    },
    /* merge a backup in: adds lists that are not here yet (by id), never deletes anything.
       -> {mine: added, received: added} or null if it is not a backup */
    importAll(b) {
      if (!b || b.app !== "kinkcheck" || !Array.isArray(b.mine) || !Array.isArray(b.received)) return null;
      const mine = S.mine.list(), rec = KC.ls.get(KC.KEYS.saved, []) || [];
      const mIds = {}, rIds = {}; mine.forEach(x => mIds[x.id] = 1); rec.forEach(x => rIds[x.id] = 1);
      let am = 0, ar = 0;
      b.mine.forEach(x => { if (x && x.id && x.data && !mIds[x.id]) { mine.push({ id: x.id, name: x.name || "", data: S.normalize(x.data), ts: x.ts || Date.now() }); am++; } });
      b.received.forEach(x => { if (x && x.id && typeof x.code === "string" && !rIds[x.id]) { rec.push(x); ar++; } });
      mine.sort((x, y) => (y.ts || 0) - (x.ts || 0)); rec.sort((x, y) => (y.ts || 0) - (x.ts || 0));
      S.mine.write(mine); KC.ls.set(KC.KEYS.saved, rec);
      /* nothing filled in here yet: take the backup's current list as well */
      if (S.isEmpty(S.loadOwn()) && b.own) { S.writeOwn(S.normalize(b.own)); if (b.active) S.mine.setActive(b.active); }
      return { mine: am, received: ar };
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
