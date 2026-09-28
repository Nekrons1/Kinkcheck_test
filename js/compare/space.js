/* compare/space.js — the pictures of the compare page (v586, owner):
   - a group as a solar system: the sun = what most of the company likes; 2–3 shared orbits (closer = the
     person's Yes/Love match the majority more); similar people sit side by side, Top + Bottom pairs first;
     Top = planet with a ring, Bottom = pink planet with a moon, no role = grey. A tap on a planet shows its
     links: its two most similar people (dashed) and its most similar Top/Bottom partner (solid), with %.
   - two people as paired planets (closer = more in common) and their two constellations laid over each other;
   - the roulette sky: a dot per shared practice, the ideas that came up are lit and numbered.
   Similarity of two lists = shared Yes/Love / sqrt(Yes/Love of one × Yes/Love of the other). */
(function (KC) {
  const esc = KC.esc, t = (k, v) => KC.i18n.t(k, v), short = id => t("pt.s." + id);
  const POS = { yes: 1, love: 1 };
  const liked = st => { const o = {}; Object.keys(st.items || {}).forEach(id => { if (POS[st.items[id].interest]) o[id] = 1; }); return o; };
  const common = (a, b) => { let n = 0; for (const k in a) if (b[k]) n++; return n; };
  const seeded = n => { let x = n; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
  const dust = (W, H, n, seed) => { const r = seeded(seed); let s = ""; for (let i = 0; i < n; i++) s += '<circle cx="' + (r() * W).toFixed(1) + '" cy="' + (r() * H).toFixed(1) + '" r="' + (r() * .9 + .3).toFixed(2) + '"/>'; return '<g fill="var(--dust)">' + s + "</g>"; };
  const spark = (x, y, r) => "M" + x + " " + (y - r) + "Q" + x + " " + y + " " + (x + r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y + r) + "Q" + x + " " + y + " " + (x - r) + " " + y + "Q" + x + " " + y + " " + x + " " + (y - r) + "Z";

  /* ---------- group: a star map of the company ---------- */
  function simMatrix(P) {
    const L = P.map(p => liked(p.st)), n = P.length, S = [];
    for (let i = 0; i < n; i++) { S[i] = []; for (let j = 0; j < n; j++) { const a = Object.keys(L[i]).length, b = Object.keys(L[j]).length; S[i][j] = i === j ? 1 : a && b ? common(L[i], L[j]) / Math.sqrt(a * b) : 0; } }
    return S;
  }
  const GROUPS = ["bondage", "ds", "sm", "sex-penetration", "fetishes", "role-play", "voyeurism-exhibitionism", "bodily-fluids", "intimacy"];
  /* two people: their constellations laid over each other (one ring, 9 groups, two stars per group) */
  function pairStars(A, B, nA, nB) {
    const by = r => { const o = {}; r.sections.forEach(x => { o[x.id] = x.pct; }); return o; }, va = by(KC.portrait.compute(A)), vb = by(KC.portrait.compute(B));
    const W = 360, H = 300, cx = 180, cy = 150, R = 96, off = 7;
    const P = GROUPS.map((id, i) => { const an = -Math.PI / 2 + i * 2 * Math.PI / GROUPS.length; return { id, an, x: cx + Math.cos(an) * R, y: cy + Math.sin(an) * R, lx: cx + Math.cos(an) * (R + 40), ly: cy + Math.sin(an) * (R + 40) }; });
    let h = '<svg viewBox="0 0 ' + W + " " + H + '" role="img">' + dust(W, H, 60, 8) + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 14) + '" fill="none" stroke="var(--ink-line)"/>';
    P.forEach(p => {
      const A1 = va[p.id], B1 = vb[p.id], both = A1 >= 55 && B1 >= 55;
      if (both) h += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="26" fill="var(--star)" opacity=".2"/>';
      const ox = Math.cos(p.an + Math.PI / 2) * off, oy = Math.sin(p.an + Math.PI / 2) * off;
      if (A1 != null) h += '<path d="' + spark(+(p.x - ox).toFixed(1), +(p.y - oy).toFixed(1), 4 + A1 / 100 * 11) + '" fill="var(--accent)" opacity="' + (.45 + A1 / 200).toFixed(2) + '"/>';
      if (B1 != null) h += '<path d="' + spark(+(p.x + ox).toFixed(1), +(p.y + oy).toFixed(1), 4 + B1 / 100 * 11) + '" fill="var(--b-col)" opacity="' + (.45 + B1 / 200).toFixed(2) + '"/>';
      h += '<text x="' + p.lx.toFixed(1) + '" y="' + (p.ly - 2).toFixed(1) + '" text-anchor="middle" font-size="11" font-family="Inter,sans-serif" fill="currentColor"' + (both ? ' font-weight="700"' : "") + ">" + esc(short(p.id))
        + '<tspan x="' + p.lx.toFixed(1) + '" dy="13" font-size="10.5"><tspan fill="var(--accent)">' + (A1 == null ? "—" : A1) + '</tspan><tspan fill="var(--muted)"> · </tspan><tspan fill="var(--b-col)">' + (B1 == null ? "—" : B1) + "</tspan></tspan></text>";
    });
    return '<div class="sp-h sp-h2">' + esc(t("sp.pair.stars")) + "</div>" + h + "</svg>"
      + '<div class="sp-note"><span class="sp-sa">✦</span> ' + esc(nA) + ' &nbsp; <span class="sp-sb">✦</span> ' + esc(nB) + " · " + esc(t("sp.pair.both")) + "</div>";
  }

  /* roulette: every dot = a practice you both like; the chosen one is lit */
  function sharedSky(n, seed, lit) {
    const W = 320, H = 96, r = seeded(seed || 5), m = Math.min(n, 220), pts = [];
    for (let i = 0; i < m; i++) pts.push([12 + r() * (W - 24), 12 + r() * (H - 24)]);
    lit = Math.min(lit || 1, m);
    /* lit stars spread out so their numbers do not collide */
    const pick = []; let guard = 0; while (pick.length < lit && guard++ < 500) { const k = Math.floor(r() * m); if (pick.every(q => Math.hypot(pts[q][0] - pts[k][0], pts[q][1] - pts[k][1]) > 60)) pick.push(k); }
    let g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img"><g fill="var(--accent)" opacity=".35">' + pts.map((p, i) => pick.indexOf(i) >= 0 ? "" : '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="1.4"/>').join("") + "</g>";
    pick.forEach((k, i) => { const c = pts[k];
      g += '<circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="13" fill="var(--star)" opacity=".18"/><path d="' + spark(+c[0].toFixed(1), +c[1].toFixed(1), 9) + '" fill="var(--star)"/>';
      if (lit > 1) g += '<text x="' + (c[0] + 11).toFixed(1) + '" y="' + (c[1] - 7).toFixed(1) + '" font-size="12" font-weight="700" font-family="Fraunces,Georgia,serif" fill="var(--star)">' + (i + 1) + "</text>"; });
    return '<div class="sp-disc">' + g + "</svg></div>";
  }

  /* ---------- VARIANT: the company as a solar system ---------- */
  function planetDefs(id, col) {
    return '<radialGradient id="' + id + '" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="' + col + '"/><stop offset="1" stop-color="' + col + '" stop-opacity=".75"/></radialGradient>';
  }
  /* Top: a planet with a ring; Bottom: a pink planet with a moon; no role: a plain grey-violet planet */
  function planetBody(X, Y, r, rl) {
    const x = X.toFixed(1), y = Y.toFixed(1);
    let body = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#' + (rl === "sub" ? "plp" : rl === "dom" ? "pl" : "pln") + ')"/>';
    if (rl === "dom") body = '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (r * 1.8) + '" ry="' + (r * .4) + '" fill="none" stroke="var(--pl-dom)" stroke-width="1.6" transform="rotate(-20 ' + x + " " + y + ')"/>' + body
      + '<path d="M' + (X - r * 1.8).toFixed(1) + " " + y + "A" + (r * 1.8) + " " + (r * .4) + " 0 0 0 " + (X + r * 1.8).toFixed(1) + " " + y + '" fill="none" stroke="var(--pl-dom)" stroke-width="1.6" transform="rotate(-20 ' + x + " " + y + ')"/>';
    if (rl === "sub") body += '<circle cx="' + (X + r * 1.6).toFixed(1) + '" cy="' + (Y - r * 1.2).toFixed(1) + '" r="' + (r * .32).toFixed(1) + '" fill="var(--star)"/><path d="M' + (X - r * 1.5).toFixed(1) + " " + (Y + 3).toFixed(1) + "A" + (r * 1.7) + " " + (r * 1.7) + " 0 0 1 " + (X + r * 1.3).toFixed(1) + " " + (Y - r * 1.5).toFixed(1) + '" fill="none" stroke="var(--star)" stroke-width=".8" stroke-dasharray="1.5 2.5" opacity=".8"/>';
    return body;
  }
  const planetAllDefs = () => planetDefs("pl", "var(--pl-dom)") + planetDefs("plp", "var(--star)") + planetDefs("pln", "var(--muted)");
  /* ---------- a group: the solar system ---------- */
  let layoutCache = { key: "", A: null };   /* a tap on a planet redraws with the same layout, no recount */
  function groupSVG(P, sel) {
    const n = P.length, S = simMatrix(P), pc = v => Math.round(v * 100), role = i => P[i].st.meta.role || "";
    const E = {}, key = (i, j) => Math.min(i, j) + "," + Math.max(i, j);
    const add = (i, j, kind) => { const k2 = key(i, j); if (!E[k2]) E[k2] = { i: Math.min(i, j), j: Math.max(i, j), v: S[i][j], kind }; else if (kind === "role") E[k2].role = true; };
    P.forEach((p, i) => { const order = P.map((q, j) => j).filter(j => j !== i).sort((a, b) => S[i][b] - S[i][a]);
      order.slice(0, 2).forEach(j => add(i, j, "near"));
      const r = role(i); if (r) { const other = r === "dom" ? "sub" : "dom", c = order.find(j => role(j) === other); if (c !== undefined) { if (order.slice(0, 2).indexOf(c) >= 0) E[key(i, c)].role = true; else add(i, c, "role"); } } });
    const edges = Object.values(E);
    const L = P.map(p => liked(p.st));
    const inTune = P.map((p, i) => { const mine = Object.keys(L[i]); if (!mine.length) return 0; const need = Math.ceil((n - 1) / 2);
      return mine.filter(id => L.filter((l, j) => j !== i && l[id]).length >= need).length / mine.length; });
    /* a few shared orbits: people are grouped by how much they match the company */
    const W = 360, H = 380, cx = W / 2, cy = H / 2, ORB = n > 6 ? [80, 115, 150] : n > 3 ? [88, 138] : [110];
    const rank = P.map((p, i) => i).sort((a, b) => inTune[b] - inTune[a]), tier = [];
    rank.forEach((i, k2) => { tier[i] = Math.min(ORB.length - 1, Math.floor(k2 * ORB.length / n)); });
    /* angles: similar people — and Top/Bottom pairs above all — sit next to each other */
    const comp = (i, j) => role(i) && role(j) && role(i) !== role(j);
    const pull = []; for (let i = 0; i < n; i++) { pull[i] = []; for (let j = 0; j < n; j++) pull[i][j] = i === j ? 0 : Math.pow(S[i][j], 3) * (comp(i, j) ? 3 : 1) + (E[key(i, j)] ? (E[key(i, j)].role || E[key(i, j)].kind === "role" ? 6 : 3) * S[i][j] : 0); }
    const place = A => A.map((a, i) => ({ x: cx + Math.cos(a) * ORB[tier[i]], y: cy + Math.sin(a) * ORB[tier[i]], a, r: ORB[tier[i]] }));
    const costA = A => { const X = place(A); let c = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(X[i].x - X[j].x, X[i].y - X[j].y); c += pull[i][j] * d + 6000 / (d + 1); if (d < 70) c += 80 * (70 - d); }
      return c; };
    const lkey = n + ";" + P.map((p, i) => role(i)).join(",") + ";" + S.map(r => r.map(v => v.toFixed(4)).join(",")).join(";");
    const rnd = seeded(5); let bestA = layoutCache.key === lkey ? layoutCache.A : null, bestC = bestA ? -1 : 1e18;
    /* simulated annealing on the angles, 8 restarts; the result is the same for the same company */
    if (!bestA) for (let run = 0; run < 8; run++) {
      let A = P.map(() => rnd() * 6.283), cur = costA(A);
      for (let it = 0; it < 3000; it++) { const T = 1 - it / 3000, i = Math.floor(rnd() * n), old = A[i]; A[i] = old + (rnd() - .5) * (.2 + 2.5 * T);
        const c = costA(A); if (c < cur || rnd() < Math.exp((cur - c) / (30 * T + .01))) cur = c; else A[i] = old;
        if (cur < bestC) { bestC = cur; bestA = A.slice(); } }
    }
    layoutCache = { key: lkey, A: bestA };
    const pts = place(bestA);
    const lo = Math.min(...edges.map(e => e.v)), hi = Math.max(...edges.map(e => e.v)), k = v => hi > lo ? (v - lo) / (hi - lo) : 1;
    let g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img"><defs>' + planetAllDefs()
      + '<radialGradient id="sun"><stop offset="0" stop-color="var(--star)" stop-opacity=".9"/><stop offset=".25" stop-color="var(--star)" stop-opacity=".5"/><stop offset="1" stop-color="var(--star)" stop-opacity="0"/></radialGradient></defs>' + dust(W, H, 120, 6);
    ORB.forEach(r => { g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--ink-line)" stroke-width=".9"/>'; });
    g += '<circle cx="' + cx + '" cy="' + cy + '" r="44" fill="url(#sun)"/><circle cx="' + cx + '" cy="' + cy + '" r="13" fill="var(--star)"/>';
    const placed = [], has = sel !== undefined && sel !== null;
    let mine = [];
    if (has) { const order = P.map((q, j) => j).filter(j => j !== sel).sort((a, b) => S[sel][b] - S[sel][a]); mine = order.slice(0, 2).map(j => ({ j, role: false }));
      const r = role(sel); if (r) { const other = r === "dom" ? "sub" : "dom", c = order.find(j => role(j) === other); if (c !== undefined) { const m = mine.find(x => x.j === c); if (m) m.role = true; else mine.push({ j: c, role: true }); } } }
    mine.forEach(({ j, role: isRole }) => {
      const A = pts[sel], B = pts[j], v = S[sel][j], w = k(v);
      /* the link never crosses the sun: if it would, it bends around it */
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dd = Math.hypot(B.x - A.x, B.y - A.y) || 1, nx = -(B.y - A.y) / dd, ny = (B.x - A.x) / dd;
      /* pick the smallest bend that keeps the curve clear of the sun and of every other planet */
      const clear = b2 => { const qx = mx + nx * b2, qy = my + ny * b2; let bad = 0;
        for (let k2 = 1; k2 < 20; k2++) { const t2 = k2 / 20, x = (1 - t2) * (1 - t2) * A.x + 2 * (1 - t2) * t2 * qx + t2 * t2 * B.x, y = (1 - t2) * (1 - t2) * A.y + 2 * (1 - t2) * t2 * qy + t2 * t2 * B.y;
          const ds = Math.hypot(x - cx, y - cy); if (ds < 50) bad += 50 - ds;
          pts.forEach((q, k3) => { if (k3 === sel || k3 === j) return; const d = Math.hypot(x - q.x, y - q.y); if (d < 34) bad += 34 - d; }); }
        return bad; };
      let bend = 10, bb = 1e9; for (let b2 = 0; b2 <= 200; b2 += 6) for (const sg of [1, -1]) { const c2 = clear(sg * b2) * 50 + b2; if (c2 < bb) { bb = c2; bend = sg * b2; } }
      const qx = mx + nx * bend, qy = my + ny * bend;
      g += '<path d="M' + A.x.toFixed(1) + " " + A.y.toFixed(1) + "Q" + qx.toFixed(1) + " " + qy.toFixed(1) + " " + B.x.toFixed(1) + " " + B.y.toFixed(1) + '" fill="none" stroke="var(--accent)" stroke-width="' + (1.5 + w * 4).toFixed(1) + '" stroke-linecap="round" opacity=".8"' + (isRole ? "" : ' stroke-dasharray="6 5"') + "/>";
      placed.push([.25 * A.x + .5 * qx + .25 * B.x, .25 * A.y + .5 * qy + .25 * B.y, v]);
    });
    placed.forEach(([x, y, v]) => { g += '<rect x="' + (x - 14).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" width="28" height="15" rx="7.5" fill="var(--panel)" stroke="var(--ink-line)"/><text x="' + x.toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="middle" font-size="9.5" font-weight="600" font-family="Inter,sans-serif" fill="var(--accent)">' + pc(v) + "%</text>"; });
    pts.forEach((q, i) => {
      const r = 10, x = q.x.toFixed(1), y = q.y.toFixed(1), rl = role(i), tw = P[i].name.length * 7.2;
      let lx = cx + Math.cos(q.a) * (q.r + r + 16), ly = cy + Math.sin(q.a) * (q.r + r + 16) + 4, c = Math.cos(q.a);
      /* keep the name inside the picture: if it would stick out, put it under the planet */
      if ((c > .35 && lx + tw > W - 4) || (c < -.35 && lx - tw < 4) || ly < 14 || ly > H - 6) { lx = q.x; ly = q.y + r + 18; c = 0; }
      const linked = has && (i === sel || mine.some(m => m.j === i)), dim = has && !linked;
      const body = planetBody(q.x, q.y, r, rl);
      g += '<g data-planet="' + i + '" style="cursor:pointer" opacity="' + (dim ? .3 : 1) + '">' + (i === sel ? '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 12) + '" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2 3"/>' : "") + body
        + '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + (c > .35 ? "start" : c < -.35 ? "end" : "middle") + '" font-size="12.5" font-weight="600" font-family="Fraunces,Georgia,serif" fill="currentColor" paint-order="stroke" stroke="var(--panel)" stroke-width="4">' + esc(P[i].name) + "</text></g>";
    });
    g += "</svg>";
    const tune = P.map((p, i) => [i, inTune[i]]).sort((a, b) => b[1] - a[1]).map(([i, v]) => "<span><b>" + esc(P[i].name) + "</b> " + pc(v) + "%</span>");
    const dash = '<span class="lg-line lg-dash"></span>', line = '<span class="lg-line"></span>';
    return '<div class="sp-box"><div class="sp-h">' + esc(t("sp.sys.h")) + "</div>" + g
      + '<div class="sp-legend"><div>' + t("sp.sys.legend_html") + "</div><div>" + t("sp.sys.tap_html", { dash, line }) + "</div></div>"
      + '<div class="sp-near"><div class="sp-sub">' + esc(t("sp.sys.tune")) + "</div>" + tune.join("") + "</div></div>";
  }
  /* ---------- two people: paired planets ---------- */
  function pairSVG(A, B, nA, nB) {
    const la = liked(A), lb = liked(B), c = common(la, lb), a = Object.keys(la).length, b = Object.keys(lb).length, s = a && b ? c / Math.sqrt(a * b) : 0;
    const W = 360, H = 200, cx = W / 2, cy = 100, sep = 44 + (1 - s) * 120;
    let g = '<svg viewBox="0 0 ' + W + " " + H + '" role="img"><defs>' + planetAllDefs() + "</defs>" + dust(W, H, 50, 4);
    g += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (sep / 2) + '" ry="' + (sep / 6 + 6) + '" fill="none" stroke="var(--ink-line)" stroke-dasharray="3 4"/>';
    g += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="var(--star)"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (sep / 2 + 30) + '" fill="var(--star)" opacity="' + (.04 + s * .1).toFixed(2) + '"/>';
    g += planetBody(cx - sep / 2, cy, 15, (A.meta || {}).role || "") + planetBody(cx + sep / 2, cy, 15, (B.meta || {}).role || "");
    const nm = (x, v) => '<text x="' + x + '" y="' + (cy + 40) + '" text-anchor="middle" font-size="12.5" font-weight="600" font-family="Fraunces,Georgia,serif" fill="currentColor">' + esc(v) + "</text>";
    g += nm(cx - sep / 2, nA) + nm(cx + sep / 2, nB);
    g += '<text x="' + cx + '" y="' + (cy - 44) + '" text-anchor="middle" font-size="12" font-family="Inter,sans-serif" fill="currentColor">' + esc(t("sp.pair.common", { n: c })) + ' · <tspan font-weight="700" fill="var(--star)">' + esc(t("sp.pair.sim", { p: Math.round(s * 100) })) + "</tspan></text>";
    g += '<text x="' + cx + '" y="' + (H - 12) + '" text-anchor="middle" font-size="10.5" font-family="Inter,sans-serif" fill="var(--muted)">' + esc(t("sp.pair.cap")) + "</text></svg>";
    return '<div class="sp-box"><div class="sp-h">' + esc(t("sp.pair.h")) + "</div>" + g + pairStars(A, B, nA, nB) + "</div>";
  }
  KC.space = { groupSVG, pairSVG, sharedSky, simMatrix, liked };
})(window.KC);
