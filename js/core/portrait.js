/* core/portrait.js — the "portrait" of a list: how much each section is liked, in percent.
   Score of a section = answers weighted (Love 1.2, Yes 1, Maybe 0.4, No −1) / (answered × 1.2), 0…100 %.
   Love weighs a bit more than Yes; every No pulls the section down; unanswered items do not count.
   A section with fewer than MIN answers has no percentage (null). Shared by the form page (portrait,
   picture card, PDF) and tests. */
(function (KC) {
  const W = { love: 1.2, yes: 1, maybe: 0.4, limit: -1 }, MAX = 1.2, MIN = 3;
  /* alphabetical in the current language (locale-aware) */
  const byName = (a, b) => KC.i18n.item(a).name.localeCompare(KC.i18n.item(b).name, KC.i18n.locale());

  KC.portrait = {
    W, MIN,
    /* st -> { sections: [{id, pct|null, answered, total}] sorted by pct (high first), love: [ids A–Z], limits: [ids A–Z],
       answered } — only items inside `set` (applied template) when given */
    compute(st, set) {
      const items = (st && st.items) || {};
      const sections = [], love = [], limits = []; let answered = 0;
      KC.CATS.forEach(c => {
        let sum = 0, n = 0, total = 0;
        c.items.forEach(([, id]) => {
          if (set && !set[id]) return;
          total++;
          const v = (items[id] || {}).interest; if (!W.hasOwnProperty(v)) return;
          sum += W[v]; n++;
          if (v === "love") love.push(id); else if (v === "limit") limits.push(id);
        });
        answered += n;
        if (total) sections.push({ id: c.id, pct: n >= MIN ? Math.max(0, Math.round(100 * sum / (n * MAX))) : null, answered: n, total });
      });
      sections.sort((a, b) => (b.pct === null ? -1 : b.pct) - (a.pct === null ? -1 : a.pct));
      love.sort(byName); limits.sort(byName);
      return { sections, love, limits, answered };
    },
  };
})(window.KC);
