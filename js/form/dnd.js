/* form/dnd.js — the joke "DnD mode" of the portrait (v591, owner): instead of the constellation sign, a D&D class
   and subclass, drawn as a constellation in the class's style, plus a joke alignment.
   Which variant: the same main groups as the sign (KC.signs.pick), but a pair does NOT depend on the order
   ("S/M + D/s" = "D/s + S/M"): 9 single variants, 36 pairs, the Chimera (three groups close together) = 46.
   Only official 5e subclasses (PHB 2014/2024, DMG, XGtE, TCoE); 13 classes, 3–4 variants each (owner).
   A figure: 9 stars, one per portrait group (the main groups are the bright ones, the rest take the other
   groups strongest first, as in the signs) + grey stars that only shape the drawing (indexes 9+ in the lines).
   Alignment (owner): Top = Lawful, Bottom = Good; the other half comes from the answers.
   Unanswered items count as HALF a "No" (owner). Names are texts: "dnd.c.<class>", "dnd.s.<class>.<sub>",
   "dnd.al.<key>" + "dnd.aq.<key>" (the one-line joke). */
(function (KC) {
  /* class: [9 points in a 100×100 box, grey points, lines (index paths; "d" first = dashed), bright slots] */
  const FIG = {
    bard: [[[10,62],[18,88],[42,98],[64,84],[62,56],[38,42],[84,12],[96,24],[38,68]], [[11,76],[28,96],[56,94],[66,70],[22,46],[54,46],[90,4],[100,14],[38,55],[51,68],[38,81],[25,68],[46,90]], [[0,9,1,10,2,11,3,12,4,5,13,0],[4,14,6,7],[6,15],[7,16],["d",21,8,6],[17,18,19,20,17]], [8,7,6]],
    barbarian: [[[50,98],[50,4],[18,6],[2,30],[18,54],[82,6],[98,30],[82,54],[50,30]], [[38,18],[38,42],[62,18],[62,42],[50,62],[50,80],[44,71],[56,71],[6,15],[6,45],[94,15],[94,45]], [[8,9,2,17,3,18,4,10,8],[8,11,5,19,6,20,7,12,8],[1,8,13,14,0],["d",15,16]], [8,0,1]],
    fighter: [[[90,6],[8,94],[10,70],[32,92],[10,6],[92,94],[68,92],[90,70],[50,50]], [[20,81],[80,81],[70,28],[30,28],[4,100],[96,100]], [[1,9,8,11,0],[2,9,3],[5,10,8,12,4],[6,10,7],[1,13],[5,14]], [0,4,8]],
    wizard: [[[4,82],[96,82],[24,74],[76,74],[36,48],[62,44],[54,22],[86,14],[48,60]], [[26,91],[50,95],[74,91],[48,51],[56,60],[48,69],[40,60],[96,24]], [[0,9,10,11,1],[0,2,3,1],[2,4,6,7,5,3],[7,16]], [8,7,0]],
    druid: [[[50,99],[50,3],[50,86],[20,78],[6,52],[22,24],[80,78],[94,52],[78,24]], [[36,66],[36,38],[64,38],[64,66],[50,60],[50,32],[34,90],[66,90],[8,66],[92,66],[10,36],[90,36],[34,10],[66,10]], [[2,15,3,9,17,4,10,19,5,21,1,22,8,20,11,7,18,12,6,16,2],[0,2,13,14,1],["d",13,4],["d",13,7],["d",14,5],["d",14,8]], [1,0,4]],
    cleric: [[[50,50],[50,30],[64,36],[70,50],[64,64],[50,70],[36,64],[30,50],[36,36]], [[50,6],[81,19],[94,50],[81,81],[50,94],[19,81],[6,50],[19,19],[63,20],[80,37],[80,63],[63,80],[37,80],[20,63],[20,37],[37,20]], [[1,2,3,4,5,6,7,8,1],[1,9],[2,10],[3,11],[4,12],[5,13],[6,14],[7,15],[8,16]], [0,1,5]],
    artificer: [[[50,5],[82,18],[95,50],[82,82],[50,95],[18,82],[5,50],[18,18],[50,50]], [[43,20],[57,20],[66,24],[76,34],[80,43],[80,57],[76,66],[66,76],[57,80],[43,80],[34,76],[24,66],[20,57],[20,43],[24,34],[34,24],[63,50],[57,61],[44,61],[37,50],[43,39],[57,39]], [[9,0,10,11,1,12,13,2,14,15,3,16,17,4,18,19,5,20,21,6,22,23,7,24,9],["d",25,26,27,28,29,30,25]], [8,0,4]],
    warlock: [[[4,60],[96,60],[50,40],[50,80],[50,60],[22,4],[78,4],[32,44],[68,44]], [[26,45],[74,45],[26,75],[74,75],[12,24],[88,24],[50,50],[50,70],[42,60],[58,60]], [[0,9,2,10,1,12,3,11,0],[7,13,5],[8,14,6],["d",15,4,16],["d",17,4,18]], [4,5,6]],
    monk: [[[36,98],[64,98],[28,70],[74,60],[6,44],[32,6],[50,2],[66,8],[82,24]], [[28,54],[36,38],[50,36],[62,38],[72,44]], [["d",0,1],[0,2,4,9],[9,10,11,12,13,3,1],[10,5],[11,6],[12,7],[13,8]], [6,4,8]],
    paladin: [[[12,8],[88,8],[10,46],[90,46],[50,97],[50,16],[50,80],[24,38],[76,38]], [[74,76],[26,76],[50,38],[50,2]], [[0,1,3,9,4,10,2,0],[5,11,6],[7,11,8],["d",5,12]], [5,4,7]],
    rogue: [[[94,6],[68,15],[88,35],[50,40],[63,53],[12,92],[4,22],[48,22],[26,26]], [[78,25],[86,16],[14,10],[26,15],[38,10],[40,32],[12,32],[16,21],[36,21]], [[0,10,9],[1,9,2],[9,3,5,4,9],["d",9,5],[6,11,12,13,7,14,8,15,6]], [5,1,8]],
    ranger: [[[30,4],[30,96],[54,20],[54,80],[62,50],[16,50],[97,50],[6,40],[6,60]], [[88,43],[88,57],[40,50],[78,50],[12,44],[12,56]], [[0,2,4,3,1],["d",0,5,1],[5,11,4,12,6],[7,13,5],[8,14,5],[9,6,10]], [6,2,3]],
    sorcerer: [[[50,97],[20,80],[80,80],[10,52],[88,54],[28,16],[52,2],[76,24],[50,66]], [[40,36],[63,40],[38,78],[50,46],[62,78],[36,58],[66,58]], [[0,1,3,5,9,6,10,7,4,2,0],["d",11,12,13,0,11]], [6,8,3]],
  };
  /* variant key -> [class, subclass]; a pair's key is its two group letters in the ORDER below, so both
     orders of a pair give the same variant; "*" = the Chimera */
  const ORDER = "nbfrdsxvw";
  const VAR = {
    n: ["cleric", "life"], b: ["monk", "openhand"], f: ["artificer", "armorer"], r: ["wizard", "illusion"], d: ["paladin", "conquest"],
    s: ["barbarian", "berserker"], x: ["bard", "glamour"], v: ["rogue", "inquisitive"], w: ["druid", "sea"],
    nb: ["monk", "mercy"], nf: ["ranger", "beastmaster"], nr: ["wizard", "enchantment"], nd: ["paladin", "devotion"],
    ns: ["warlock", "celestial"], nx: ["fighter", "champion"], nv: ["bard", "dance"], nw: ["druid", "dreams"],
    bf: ["fighter", "runeknight"], br: ["ranger", "hunter"], bd: ["warlock", "greatoldone"], bs: ["fighter", "battlemaster"],
    bx: ["monk", "astral"], bv: ["rogue", "arcanetrickster"], bw: ["druid", "land"],
    fr: ["wizard", "transmutation"], fd: ["artificer", "battlesmith"], fs: ["artificer", "artillerist"], fx: ["bard", "creation"],
    fv: ["rogue", "swashbuckler"], fw: ["artificer", "alchemist"],
    rd: ["warlock", "fiend"], rs: ["barbarian", "wildheart"], rx: ["cleric", "trickery"], rv: ["bard", "eloquence"], rw: ["druid", "moon"],
    ds: ["paladin", "vengeance"], dx: ["warlock", "archfey"], dv: ["paladin", "glory"], dw: ["cleric", "tempest"],
    sx: ["barbarian", "beast"], sv: ["barbarian", "stormherald"], sw: ["sorcerer", "aberrant"],
    xv: ["sorcerer", "draconic"], xw: ["sorcerer", "storm"],
    vw: ["ranger", "gloomstalker"],
    "*": ["sorcerer", "wildmagic"],
  };
  const keyOf = main => main.length === 3 ? "*"
    : main.map(m => Object.keys(KC.signs.KEY).find(k => KC.signs.KEY[k] === m.id)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join("");

  /* portrait data -> the figure in the same shape as a sign (stars 0–8 carry a group, grey stars follow), or null */
  function pick(d) {
    const sg = KC.signs.pick(d); if (!sg) return null;
    const key = keyOf(sg.main), [cls, sub] = VAR[key], [P, E, L, B] = FIG[cls];
    const rest = d.sections.filter(s => KC.signs.GROUPS.indexOf(s.id) >= 0 && sg.main.indexOf(s) < 0);
    const stars = P.map(p => ({ x: p[0], y: p[1], bright: false, s: null }));
    sg.main.forEach((m, k) => { stars[B[k]].bright = true; stars[B[k]].s = m; });
    let r = 0; stars.forEach(st => { if (!st.s) st.s = rest[r++] || null; });
    E.forEach(p => stars.push({ x: p[0], y: p[1], grey: true, bright: false, s: null }));
    return { dnd: true, key, cls, sub, stars, lines: L, main: sg.main, kind: sg.kind };
  }

  /* the joke alignment: st = the list, d = its portrait, set = the applied template (or null) */
  const LIM = { NO: .6, LAW: .35, CHAOS: .3, GOOD: 60, EVIL: 60, FEW: 20 };
  function alignment(st, d, set) {
    let n = 0, no = 0, maybe = 0, answered = 0;
    KC.CATS.forEach(c => { if (KC.portrait.OUT[c.id]) return; c.items.forEach(([, id]) => {
      if (set && !set.has(id)) return;
      n++; const v = (st.items[id] || {}).interest;
      if (v) answered++;
      if (v === "limit") no++; else if (v === "maybe") maybe++; else if (!v) no += .5;   /* unanswered = half a "No" */
    }); });
    if (answered < LIM.FEW || !n) return "roll";
    const pNo = no / n, pMaybe = maybe / n, role = st.meta && st.meta.role;
    if (pNo >= LIM.NO) return "boring";
    const pct = id => { const s = d.sections.find(x => x.id === id); return s && s.pct !== null ? s.pct : 0; };
    const law = role === "dom" ? "L" : pMaybe >= LIM.CHAOS ? "C" : pNo >= LIM.LAW ? "L" : "N";
    const sm = pct("sm"), ten = pct("intimacy");
    const good = role === "sub" ? "G" : sm >= LIM.EVIL && sm >= ten ? "E" : ten >= LIM.GOOD ? "G" : "N";
    return law + good;
  }
  const ALIGN = ["LG", "NG", "CG", "LN", "NN", "CN", "LE", "NE", "CE", "boring", "roll"];

  /* the mode is remembered on this device only */
  const on = () => KC.ls.raw(KC.KEYS.dnd) === "1";
  const setOn = v => { if (v) KC.ls.setRaw(KC.KEYS.dnd, "1"); else KC.ls.del(KC.KEYS.dnd); };

  KC.dnd = { FIG, VAR, ORDER, ALIGN, LIM, keyOf, pick, alignment, on, set: setOn };
})(window.KC);
