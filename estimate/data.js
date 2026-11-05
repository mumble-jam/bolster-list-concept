// Estimate concept: the sample estimate and its maths. Made up, shaped by Bolster's estimate
// (docs/research/estimate/bolster.md) and the estimation prototype (docs/research/estimate/prototype.md).
// The job is the one the forms concept creates from Marco Ruiz's voicemail, now being priced.
//
// Kinds of line (Bolster's, not more):
//   assembly   holds other lines; its quantity multiplies everything in it; its cost and price add up its lines
//   item       a cost item: labor, materials and subcontracted are three parts any line can have, per unit
//   selection  a choice among options: the customer's (they pick on the proposal, starting from a current
//              option) or yours (locked and hidden from the proposal; nothing is priced until you pick)
//   fee        a percentage of the project's cost
// Quantities are typed, or a formula over the job's measurements (codes like `ra`); an item bought by the
// piece rounds its materials up to whole pieces, after waste.
window.EST = (() => {
  let n = 0;
  const id = () => `l${++n}`;
  const A = (name, o, children) => ({ id: id(), kind: "assembly", name, qty: 1, unit: "each", children, ...o });
  // photos for the name's slot (D55), from Wikimedia Commons under open licences: [thumbnail, author, licence, file page],
  // credited in the line's record. Materials and the selections' current options have them; labor, permits, fees and
  // assemblies show the placeholder
  const COMMONS = "https://thumb.wikimedia.org/wikipedia/commons/thumb/";
  const PHOTOS = {
    "Dumpster, 20 yd": [`${COMMONS}d/d0/Roll-Off.jpg/120px-Roll-Off.jpg`, "Boomer77", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:Roll-Off.jpg"],
    Shingles: [`${COMMONS}6/67/Shingles_atop_roof.jpg/120px-Shingles_atop_roof.jpg`, "Joe Mabel", "CC BY 4.0", "https://commons.wikimedia.org/wiki/File:Shingles_atop_roof.jpg"],
    "Base cabinets": [`${COMMONS}3/3f/Kitchen_cabinets_in_San_Diego.jpg/120px-Kitchen_cabinets_in_San_Diego.jpg`, "GS Kitchen Re", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Kitchen_cabinets_in_San_Diego.jpg"],
    "Wall cabinets": [`${COMMONS}a/a5/K%C3%BCchenschr%C3%A4nke_kitchen_cabinets_%D0%BA%D1%83%D1%85%D0%BD%D1%8F.jpg/120px-K%C3%BCchenschr%C3%A4nke_kitchen_cabinets_%D0%BA%D1%83%D1%85%D0%BD%D1%8F.jpg`, "Algeyav", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:K%C3%BCchenschr%C3%A4nke_kitchen_cabinets_%D0%BA%D1%83%D1%85%D0%BD%D1%8F.jpg"],
    "Cabinet hardware, brushed nickel": [`${COMMONS}c/cf/Kitchen_cabinet_hardware_2009.jpg/120px-Kitchen_cabinet_hardware_2009.jpg`, "Tomwsulcer", "Public domain", "https://commons.wikimedia.org/wiki/File:Kitchen_cabinet_hardware_2009.jpg"],
    Countertop: [`${COMMONS}a/a2/Granite_for_Countertops_04.jpg/120px-Granite_for_Countertops_04.jpg`, "Stilfehler", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Granite_for_Countertops_04.jpg"],
    "Wall paint, eggshell": [`${COMMONS}0/03/White_primer_bucket.jpg/120px-White_primer_bucket.jpg`, "Daniel Case", "CC BY-SA 3.0", "https://commons.wikimedia.org/wiki/File:White_primer_bucket.jpg"],
  };
  const I = (name, o) => ({ id: id(), kind: "item", unit: "each", margin: 0.3, stage: "Install", photo: PHOTOS[name], ...o, name });
  const S = (name, o) => ({ id: id(), kind: "selection", unit: "each", margin: 0.3, stage: "Install", photo: PHOTOS[name], ...o, name });
  const F = (name, o) => ({ id: id(), kind: "fee", unit: "each", margin: 0, stage: "General", ...o, name });
  const cost = (m, l, s) => ({ m: m ?? null, l: l ?? null, s: s ?? null });

  const TEAM = [
    { id: "me", name: "Dana Whitfield", initials: "DW", color: 2 },
    { id: "hiro", name: "Hiro Nakamura", initials: "HN", color: 5 },
    { id: "luis", name: "Luis Ortega", initials: "LO", color: 3 },
    { id: "tess", name: "Tess Brandt", initials: "TB", color: 6 },
  ];
  const STAGES = ["General", "Demolition", "Rough-in", "Install", "Finish"];
  const UNITS = ["each", "sq", "sq ft", "ft", "hr", "gal", "roll", "piece", "day"];

  // the job's measurements: what quantities are worked out from; one without a value leaves its lines unpriced
  const DIMS = [
    { id: "d1", code: "ra", name: "Roof area", value: 1850, unit: "sq ft", scope: "roof", how: "Measured from the satellite view, Oct 28" },
    { id: "d2", code: "er", name: "Eaves and rakes", value: 210, unit: "ft", scope: "roof" },
    { id: "d3", code: "rl", name: "Ridge length", value: 42, unit: "ft", scope: "roof" },
    { id: "d4", code: "wa", name: "Kitchen wall area", value: 420, unit: "sq ft", scope: "kitchen" },
    { id: "d5", code: "ca", name: "Countertop area", value: 42, unit: "sq ft", scope: "kitchen" },
    { id: "d6", code: "ba", name: "Backsplash area", value: null, unit: "sq ft", scope: "kitchen", how: "Take it on the site visit" },
  ];

  const roof = A("Roof replacement", { key: "roof", category: "Roofing – Shingle", stage: "Install", notes: "Tear off to the deck; replace soft decking as found (billed as a change order)." }, [
    I("Tear-off, one layer", { formula: "ceil(ra / 100)", unit: "sq", c: cost(null, 55), stage: "Demolition", assignee: "hiro", desc: "Old shingles and nails off, down to the deck." }),
    I("Dumpster, 20 yd", { qty: 1, c: cost(null, null, 485), stage: "Demolition", vendor: "Austin Roll-Off", desc: "Dropped in the drive, taken away when the roof is on." }),
    S("Shingles", { chooser: "customer", formula: "ceil(ra * 1.1 / 100)", unit: "sq", current: 0, assignee: "hiro", desc: "The colour and line Marco will see on the proposal.",
      options: [
        { name: "Architectural, GAF Timberline HDZ, Charcoal", c: cost(118), note: "Most picked" },
        { name: "Designer, GAF Camelot II, Barkwood", c: cost(236) },
        { name: "3-tab, GAF Royal Sovereign, Slate", c: cost(92) },
      ] }),
    I("Synthetic underlayment, 1,000 sq ft roll", { formula: "ceil(ra * 1.1 / 1000)", unit: "roll", c: cost(189), autocost: true, sku: "100051375", desc: "Lies flat, holds in high wind." }),
    I("Drip edge, 10 ft, dark brown", { formula: "er", unit: "ft", c: cost(1.24), buy: { by: "piece", size: 10, price: 12.4, waste: 10 }, autocost: true, desc: "28-gauge steel along the eaves and rakes." }),
    I("Ridge vent, 4 ft", { formula: "rl", unit: "ft", c: cost(5.25), buy: { by: "piece", size: 4, price: 21, waste: 0 }, autocost: true }),
    A("Flashings", { category: "Roofing – Misc. materials" }, [
      S("Step and counter flashing", { chooser: "you", qty: 36, unit: "ft", current: null, desc: "Where the roof meets the kitchen's wall.",
        options: [
          { name: "Aluminium, mill finish", c: cost(2.1) },
          { name: "Galvanised steel, painted brown", c: cost(2.6) },
          { name: "Copper, 16 oz", c: cost(11.4), note: "Ask before picking: about 4× the cost" },
        ] }),
      I("Pipe boots, 1–3 in", { qty: 3, c: cost(18), autocost: true }),
      I("Roof sealant, 10 oz", { qty: null, unit: "tube", c: cost(9.5), desc: "Around the boots and the wall flashing." }),
    ]),
    I("Shingle install", { formula: "ceil(ra / 100)", unit: "sq", c: cost(null, 68), assignee: "hiro", desc: "Crew of three, about two days." }),
  ]);

  const kitchen = A("Kitchen remodel", { key: "kitchen", category: "Kitchen", stage: "Install" }, [
    A("Permits", { category: "Permits", stage: "General" }, [
      I("Building permit", { qty: 1, c: cost(null, null, 1120), margin: 0, stage: "General", desc: "Needed when walls move or doorways widen." }),
      I("Plumbing permit", { qty: 1, c: cost(null, null, 640), margin: 0, stage: "General" }),
      I("Electrical permit", { qty: 1, c: cost(null, null, 760), margin: 0, stage: "General" }),
      I("Gas permit", { qty: 1, c: cost(null, null, 380), margin: 0, stage: "General", optional: true, included: false, desc: "Only if the range's gas line moves." }),
    ]),
    A("Demolition", { category: "Demolition", stage: "Demolition" }, [
      I("Cabinet and counter removal", { qty: 12, unit: "hr", c: cost(null, 55), stage: "Demolition", assignee: "luis" }),
      I("Haul-away", { qty: 1, c: cost(null, null, 0), stage: "Demolition", desc: "Price on its way from Austin Roll-Off." }),
    ]),
    A("Cabinets", { category: "Kitchen – Cabinets" }, [
      S("Base cabinets", { chooser: "customer", qty: 6, current: 0, traits: [["Style", ["Shaker", "Flat panel"]], ["Finish", ["Dove grey", "White", "Natural oak"]]],
        options: [
          { name: "Shaker, Dove grey", t: ["Shaker", "Dove grey"], c: cost(286) },
          { name: "Shaker, White", t: ["Shaker", "White"], c: cost(286) },
          { name: "Shaker, Natural oak", t: ["Shaker", "Natural oak"], c: cost(342) },
          { name: "Flat panel, Dove grey", t: ["Flat panel", "Dove grey"], c: cost(254) },
          { name: "Flat panel, White", t: ["Flat panel", "White"], c: cost(254) },
          { name: "Flat panel, Natural oak", t: ["Flat panel", "Natural oak"], c: cost(318) },
        ] }),
      S("Wall cabinets", { chooser: "customer", qty: 5, current: 0, follows: "Base cabinets",
        options: [
          { name: "Shaker, 30 in, Dove grey", c: cost(178) },
          { name: "Flat panel, 30 in, Dove grey", c: cost(162) },
        ] }),
      I("Cabinet hardware, brushed nickel", { qty: 22, c: cost(6.5), autocost: true }),
      I("Cabinet install", { qty: 16, unit: "hr", c: cost(null, 55), assignee: "luis" }),
    ]),
    S("Countertop", { chooser: "customer", formula: "ca", unit: "sq ft", current: 0, c: cost(null, null, 0), assignee: "tess",
      options: [
        { name: "Quartz, 3 cm, Calacatta", c: cost(null, null, 68), note: "Fabricated and fitted by Stone Works" },
        { name: "Granite, 3 cm, Steel grey", c: cost(null, null, 58) },
        { name: "Laminate, Formica 180fx", c: cost(null, null, 28) },
      ] }),
    S("Backsplash tile", { chooser: "customer", formula: "ba * 1.1", unit: "sq ft", current: 0,
      options: [
        { name: "Subway, 3×6, gloss white", c: cost(4.2, 14) },
        { name: "Zellige, 4×4, sage", c: cost(16.5, 18) },
      ] }),
    S("Plumbing rough-in", { chooser: "you", qty: 1, current: 0, stage: "Rough-in", desc: "An allowance until the plumber's quote comes in.",
      options: [{ name: "Sink and dishwasher stay", c: cost(null, null, 1200) }, { name: "Sink moves to the island", c: cost(null, null, 2850) }] }),
    S("Range hood vent", { chooser: "you", qty: 1, current: null, stage: "Rough-in", desc: "How the hood vents out.",
      options: [{ name: "Through the wall", c: cost(85, 420) }, { name: "Through the roof", c: cost(140, 680), note: "Needs the roof crew while they're up" }, { name: "Recirculating", c: cost(60, 120) }] }),
    I("Electrical rough-in", { qty: 1, c: cost(null, null, 1450), stage: "Rough-in", vendor: "Brightline Electric" }),
    I("Wall paint, eggshell", { formula: "ceil(wa * 2 / 350)", unit: "gal", c: cost(42), stage: "Finish" }),
    I("Painting", { qty: 14, unit: "hr", c: cost(null, 48), stage: "Finish", assignee: "luis" }),
    I("Under-cabinet lighting", { qty: 1, c: cost(260, 380), stage: "Finish", optional: true, included: false, desc: "LED strips under the wall cabinets, on a dimmer." }),
  ]);

  const TREE = [
    I("Site visit and measure", { qty: 1, unit: "visit", c: cost(null, 104), stage: "General", assignee: "me", desc: "Photos, the roof deck and the kitchen walls." }),
    roof,
    kitchen,
    F("Project management", { base: "cost", rate: 6, desc: "Scheduling, permits and the crews, as a share of the project's cost." }),
  ];

  // ---------- maths ----------
  const FNS = { ceil: Math.ceil, floor: Math.floor, round: Math.round, min: Math.min, max: Math.max, sqrt: Math.sqrt };
  function evalFormula(expr, dims) {
    const known = Object.fromEntries(dims.map((d) => [d.code, d.value]));
    if (!/^[\w\s.+\-*/(),]*$/.test(expr)) return { error: "Only numbers, measurement codes, + − × ÷ and brackets" };
    const names = expr.match(/[a-z_][a-z0-9_]*/gi) || [];
    const unknown = names.find((x) => !(x in known) && !(x in FNS));
    if (unknown) return { error: `No measurement called “${unknown}”` };
    const missing = names.filter((x) => x in known && known[x] == null);
    if (missing.length) return { missing: [...new Set(missing)] };
    try {
      const v = Function(...Object.keys(FNS), ...Object.keys(known), `return (${expr});`)(...Object.values(FNS), ...Object.values(known));
      return Number.isFinite(v) ? { value: Math.round(v * 100) / 100 } : { error: "That doesn't work out to a number" };
    } catch { return { error: "That formula has a mistake in it" }; }
  }
  const usesOf = (expr) => [...new Set((expr || "").match(/[a-z_][a-z0-9_]*/gi) || [])].filter((x) => !(x in FNS));

  return { TREE, DIMS, TEAM, STAGES, UNITS, evalFormula, usesOf, JOB: { customer: "Marco Ruiz", initials: "MR", color: 4, name: "Kitchen and roof refresh", number: "1043", site: "70 Orchard Ln, Austin, TX 78745", email: "marco.ruiz@example.com", status: "Draft", tax: 0.0825, discount: 0 } };
})();
