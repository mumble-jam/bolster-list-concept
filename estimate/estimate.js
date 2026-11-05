// Estimate concept, round 2: the job's window, its estimate as a list page (the system's table, toolbar, summary
// cards, record and floating bar), and one record for every kind of line, its form opening up a step at a time.
// Every change saves as it's made (the bar says so; its history undoes). Sample data and maths: data.js.
(() => {
  const E = window.EST, ic = window.BolsterIcons;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (v, o = {}) => (v ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: o.whole ? 0 : 2, maximumFractionDigits: o.whole ? 0 : 2 });
  const num = (v) => (v ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const pct = (v) => `${(Math.round(v * 1000) / 10).toLocaleString("en-US")}%`;
  const markup = (m) => (m >= 1 ? "" : `×${(1 / (1 - m)).toFixed(2)}`);
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  // the markup in words, for the comfortable record: what's added to the cost
  const addsWords = (m) => (m >= 1 ? "" : !m ? "Sold at cost" : `You add ${pct(1 / (1 - m) - 1)} to your cost`);
  const clone = (x) => structuredClone(x);
  const toast = (m, o) => BolsterShell.toast(m, o);

  // ---------- the model ----------
  const KEY = "bolster-concepts:estimate:3";
  let M; // { tree, dims, job }
  const fresh = () => ({ tree: clone(E.TREE), dims: clone(E.DIMS), job: clone(E.JOB), sent: null, seq: 100 });
  try { M = JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch { M = fresh(); }
  const persist = () => { try { sessionStorage.setItem(KEY, JSON.stringify(M)); } catch {} };

  let byId = new Map(), parentOf = new Map(), order = [];
  function index() {
    byId = new Map(); parentOf = new Map(); order = [];
    const walk = (list, parent, level) => list.forEach((x) => { byId.set(x.id, x); parentOf.set(x.id, parent); x.level = level; order.push(x); if (x.children) walk(x.children, x, level + 1); });
    walk(M.tree, null, 0);
  }
  const listOf = (x) => (parentOf.get(x.id)?.children ?? M.tree);
  const pathOf = (x) => { const p = []; for (let a = parentOf.get(x.id); a; a = parentOf.get(a.id)) p.unshift(a); return p; };
  const isLeaf = (x) => x.kind !== "assembly";
  const descendants = (x) => (x.children ? x.children.flatMap((c) => [c, ...descendants(c)]) : []);
  const dimByCode = (c) => M.dims.find((d) => d.code === c);
  const person = (id) => E.TEAM.find((t) => t.id === id);

  // quantity: typed, or worked out from measurements
  function qtyOf(x) {
    if (x.formula) {
      const r = E.evalFormula(x.formula, M.dims);
      if (r.value != null) return { value: r.value, formula: true };
      return { value: null, formula: true, missing: r.missing, error: r.error };
    }
    return { value: x.qty ?? null };
  }
  const included = (x) => !(x.optional && !x.included);
  const optionOf = (x) => (x.kind === "selection" && x.current != null ? x.options[x.current] : null);
  // a line's cost per unit, by part; a selection's is its current option's
  const partsOf = (x) => (x.kind === "selection" ? optionOf(x)?.c ?? { m: null, l: null, s: null } : x.c ?? { m: null, l: null, s: null });
  const unitCost = (x) => { const p = partsOf(x); return (p.m ?? 0) + (p.l ?? 0) + (p.s ?? 0); };
  const priceOf = (cost, margin) => (margin >= 1 ? cost : cost / (1 - margin));

  // totals: per line its labor, materials, subcontracted, cost and price; an assembly adds up its lines and
  // multiplies them by its own quantity; a fee is its rate of the project's cost (the lines that aren't fees)
  let T = new Map();
  function compute() {
    T = new Map();
    const leaf = (x, mult) => {
      const q = qtyOf(x), qty = q.value ?? 0, p = partsOf(x);
      let m = (p.m ?? 0) * qty;
      let buy = null;
      if (x.buy && p.m != null) { const pieces = Math.ceil((qty * (1 + (x.buy.waste || 0) / 100)) / x.buy.size - 1e-9); m = pieces * x.buy.price; buy = pieces; }
      const r = { m: m * mult, l: (p.l ?? 0) * qty * mult, s: (p.s ?? 0) * qty * mult, qty, buy };
      r.cost = r.m + r.l + r.s; r.price = priceOf(r.cost, x.margin ?? 0);
      if (!included(x)) { r.out = { ...r }; r.m = r.l = r.s = r.cost = r.price = 0; }
      return r;
    };
    const walk = (x, mult) => {
      if (x.kind === "fee") return { m: 0, l: 0, s: 0, cost: 0, price: 0 }; // after the rest
      if (!x.children) { const r = leaf(x, mult); T.set(x.id, r); return r; }
      const k = (x.qty ?? 1) * mult, r = { m: 0, l: 0, s: 0, cost: 0, price: 0 };
      x.children.forEach((c) => { const t = walk(c, k); r.m += t.m; r.l += t.l; r.s += t.s; r.cost += t.cost; r.price += t.price; });
      if (!included(x)) { r.out = { ...r }; r.m = r.l = r.s = r.cost = r.price = 0; }
      T.set(x.id, r);
      return r;
    };
    const top = { m: 0, l: 0, s: 0, cost: 0, price: 0 };
    M.tree.forEach((x) => { const t = walk(x, 1); top.m += t.m; top.l += t.l; top.s += t.s; top.cost += t.cost; top.price += t.price; });
    const base = { cost: top.cost, price: top.price, labor: top.l };
    order.filter((x) => x.kind === "fee").forEach((f) => {
      const cost = included(f) ? (base[f.base] ?? base.cost) * (f.rate / 100) : 0;
      const r = { m: 0, l: 0, s: cost, cost, price: priceOf(cost, f.margin ?? 0), qty: 1, base: base[f.base] ?? base.cost };
      T.set(f.id, r);
      for (let a = parentOf.get(f.id); a; a = parentOf.get(a.id)) { const t = T.get(a.id); t.s += r.s; t.cost += r.cost; t.price += r.price; }
      top.s += r.s; top.cost += r.cost; top.price += r.price;
    });
    top.profit = top.price - top.cost;
    top.discount = M.job.discount || 0;
    top.subtotal = top.price - top.discount;
    top.tax = top.subtotal * M.job.tax;
    top.total = top.subtotal + top.tax;
    T.set("job", top);
  }

  // what a line still needs: a quantity (none typed, or a measurement missing), your pick, the customer's
  // pick (theirs, after sending: information, not a blocker), a cost
  function needsOf(x) {
    const n = [];
    if (!isLeaf(x) || x.kind === "fee") return n;
    const q = qtyOf(x);
    if (q.value == null || q.value === 0) n.push("qty");
    if (x.kind === "selection" && x.chooser === "you" && x.current == null) n.push("choose");
    if (x.kind === "selection" && x.chooser === "customer") n.push("customer");
    if (included(x) && !n.includes("qty") && !n.includes("choose") && unitCost(x) === 0) n.push("nocost");
    return n;
  }
  const SLICES = [
    { key: "qty", label: "Quantities to set", icon: "ruler-combined", tip: "Lines without a quantity: typed, or a measurement that hasn't been taken. They price at nothing." },
    { key: "choose", label: "Your choices", icon: "grid", tip: "Selections you make (hidden from the proposal). Nothing is priced until you pick." },
    { key: "nocost", label: "No cost yet", icon: "dollar", tip: "Lines in the estimate whose cost is still $0." },
  ];

  // ---------- the page's state ----------
  const ui = {
    open: null, // a line's id, or "dims"
    folded: new Set(), search: "", slice: null,
    filters: { kind: new Set(), cost: new Set(), stage: new Set(), assignee: new Set() },
    group: "tree", cols: { margin: true, split: false, stage: false, assignee: false },
    selected: new Set(), adding: null, edit: null, revealed: new Set(), revealing: null, history: [], loading: false, failed: false,
  };
  const COLS = { margin: "Margin", split: "Labor and materials", stage: "Stage", assignee: "Assigned to" };
  const KINDS = { item: "Cost item", assembly: "Assembly", "sel-customer": "Customer's choice", "sel-you": "Your choice", fee: "Fee" };
  const kindKey = (x) => (x.kind === "selection" ? `sel-${x.chooser}` : x.kind);
  const KIND_ICON = { item: "toolbox", assembly: "layers", "sel-customer": "palette", "sel-you": "grid", fee: "percent" };
  // the kinds a cost is made of: the system's words, icons and order (system/model/kinds.json, D50, D53)
  const PART = { l: ["Labor", "hard-hat"], m: ["Materials", "box"], s: ["Subcontracted", "handshake"] };
  const costKinds = (x) => { const p = partsOf(x); return ["l", "m", "s"].filter((k) => p[k] != null); };

  // ---------- saving: every change saves as it's made ----------
  const undoStack = [];
  function change(label, fn, { toastUndo = false } = {}) {
    const before = clone({ tree: M.tree, dims: M.dims, job: M.job });
    fn();
    undoStack.push({ label, before, at: new Date() });
    if (undoStack.length > 40) undoStack.shift();
    if (M.sent) M.sent.changes = (M.sent.changes || 0) + 1;
    index(); compute(); persist();
    saving();
    render();
    if (toastUndo) toast(label, { undo: () => undo() });
  }
  function undo() {
    const last = undoStack.pop();
    if (!last) return;
    Object.assign(M, clone(last.before));
    if (M.sent) M.sent.changes = Math.max(0, (M.sent.changes || 1) - 1);
    index(); compute(); persist();
    if (ui.open && ui.open !== "dims" && !byId.has(ui.open)) closeRecord();
    saving(); render();
    toast(`Undone: ${last.label}`);
  }
  let saveTimer = 0;
  function saving() {
    const t = $("#job-saved-text");
    t.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { t.textContent = "Saved"; $("#job-saved").dataset.tip = `Saved just now · ${plural(undoStack.length, "change")} today`; }, 450);
  }

  // ---------- rows ----------
  const visibleCols = () => ["margin", "split", "stage", "assignee"].filter((c) => ui.cols[c]);
  const matches = (x) => {
    const q = ui.search.trim().toLowerCase();
    if (!q) return true;
    const hay = [x.name, x.desc, x.category, ...(x.options || []).map((o) => o.name)].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  };
  function passes(x) {
    if (!isLeaf(x)) return false;
    const f = ui.filters;
    if (f.kind.size && !f.kind.has(kindKey(x))) return false;
    if (f.cost.size && !costKinds(x).some((k) => f.cost.has(k))) return false;
    if (f.stage.size && !f.stage.has(x.stage)) return false;
    if (f.assignee.size && !f.assignee.has(x.assignee || "none")) return false;
    if (ui.slice && !needsOf(x).includes(ui.slice)) return false;
    return matches(x) || pathOf(x).some(matches);
  }
  const narrowing = () => !!(ui.search.trim() || ui.slice || Object.values(ui.filters).some((s) => s.size));
  // which lines show: everything (folded as you left it), or what passes the filters with the assemblies around it
  function shown() {
    if (!narrowing()) return null;
    const keep = new Set();
    order.forEach((x) => {
      const assemblyHit = !isLeaf(x) && ui.search.trim() && matches(x) && !ui.slice && !Object.values(ui.filters).some((s) => s.size);
      if (passes(x) || assemblyHit) { keep.add(x.id); pathOf(x).forEach((a) => keep.add(a.id)); if (assemblyHit) descendants(x).forEach((d) => keep.add(d.id)); }
    });
    return keep;
  }

  // a cost item's tile is what it's made of (labor, materials, subcontracted; several: the kinds' toolbox)
  const tileIcon = (x) => { if (x.kind !== "item") return KIND_ICON[kindKey(x)]; const k = costKinds(x); return k.length === 1 ? PART[k[0]][1] : "toolbox"; };
  const kindTile = (x) => `<span class="est-kind" data-kind="${kindKey(x)}" aria-hidden="true">${ic(tileIcon(x), 14, { optical: true })}</span>`;
  // the name's slot holds the line's photo (D55); the placeholder under it is the line's kind, so a line without one
  // still says what it is
  const thumbOf = (x) => `<span class="thumb est-thumb" data-kind="${kindKey(x)}" aria-hidden="true">${ic(tileIcon(x), 16, { optical: true })}${x.photo ? `<img src="${esc(x.photo[0])}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span>`;
  const photoAt = (src, w) => src.replace(/\/\d+px-/, `/${w}px-`);
  // the photo, large at the top of the record (D55), with the credit its licence asks for; the link leaves the app (D40)
  const photoHtml = (x) => (x.photo ? `<figure class="detail-photo"><img src="${esc(photoAt(x.photo[0], 500))}" alt="${esc(x.name)}" decoding="async" onerror="this.parentElement.remove()"><figcaption>Photo: <a href="${esc(x.photo[3])}" target="_blank" rel="noopener">${esc(x.photo[1])}, ${esc(x.photo[2])}&nbsp;${ic("m-external", 12)}</a></figcaption></figure>` : "");
  function subOf(x) {
    if (x.kind === "assembly") return [x.category, plural(descendants(x).filter(isLeaf).length, "line")].filter(Boolean).join(" · ");
    if (x.kind === "selection") {
      const o = optionOf(x);
      if (!o) return `<span class="est-todo">Choose an option</span> · ${plural(x.options.length, "option")}`;
      return `${x.chooser === "customer" ? "Current: " : "Picked: "}${esc(o.name)}`;
    }
    if (x.kind === "fee") return `${num(x.rate)}% of the project's ${x.base === "price" ? "price" : x.base === "labor" ? "labor" : "cost"}`;
    return esc(x.desc || "");
  }
  function qtyCell(x) {
    if (x.kind === "fee") return `<span class="est-muted">—</span>`;
    const q = qtyOf(x), unit = esc(x.unit);
    if (x.kind === "assembly") return `${num(x.qty ?? 1)} ${unit}`;
    if (q.value == null || q.value === 0) {
      const why = q.missing ? `Needs the ${q.missing.map((c) => dimByCode(c)?.name.toLowerCase() || c).join(", ")}` : "No quantity yet";
      return `<button type="button" class="est-set" data-set-qty="${x.id}" data-tip="${esc(why)}">Set qty</button>`;
    }
    return `${q.formula ? `<span class="est-f" data-tip="Worked out from measurements: ${esc(x.formula)}">${ic("calculator", 12)}</span>` : ""}${num(q.value)} ${unit}`;
  }
  function priceCells(x, t) {
    if (!included(x)) return `<td data-numeric class="est-muted"></td>${ui.cols.margin ? `<td data-numeric></td>` : ""}<td data-numeric data-m="trail" class="est-out">Not included</td>`;
    const mg = x.kind === "assembly" ? marginRange(x) : pct(x.margin ?? 0);
    return `<td data-numeric class="est-cost">${money(t.cost)}</td>${ui.cols.margin ? `<td data-numeric class="est-margin">${mg}</td>` : ""}<td data-numeric data-m="trail" class="est-price">${money(t.price)}</td>`;
  }
  function marginRange(a) {
    const ms = descendants(a).filter((d) => isLeaf(d) && d.kind !== "fee").map((d) => d.margin ?? 0);
    if (!ms.length) return "—";
    const lo = Math.min(...ms), hi = Math.max(...ms);
    return lo === hi ? pct(lo) : `${pct(lo)}–${pct(hi)}`;
  }
  function extraCells(x, t) {
    let h = "";
    if (ui.cols.split) h += `<td class="est-split">${x.kind === "assembly" || x.kind === "fee" ? splitBar(t) : costKinds(x).map((k) => `<span class="est-part" data-part="${k}">${ic(PART[k][1], 12)}${PART[k][0]}</span>`).join("")}</td>`;
    if (ui.cols.stage) h += `<td>${isLeaf(x) ? esc(x.stage || "—") : ""}</td>`;
    if (ui.cols.assignee) { const p = person(x.assignee); h += `<td>${isLeaf(x) ? (p ? `<span class="cell-person"><span class="avatar" data-size="sm" data-color="${p.color}" aria-hidden="true">${p.initials}</span>${esc(p.name.split(" ")[0])}</span>` : `<span class="est-muted">—</span>`) : ""}</td>`; }
    return h;
  }
  const splitBar = (t) => { const c = t.cost || 1; return `<span class="est-bar" role="img" aria-label="Labor ${money(t.l, { whole: true })}, materials ${money(t.m, { whole: true })}, subcontracted ${money(t.s, { whole: true })}">${["l", "m", "s"].map((k) => `<span data-part="${k}" style="--w:${(t[k] / c) * 100}%"></span>`).join("")}</span>`; };

  function rowHtml(x, { flat = false } = {}) {
    const t = T.get(x.id) || {}, lvl = flat ? 0 : x.level, isA = x.kind === "assembly";
    const sel = ui.selected.has(x.id), some = isA && !sel && descendants(x).some((d) => ui.selected.has(d.id));
    const folded = ui.folded.has(x.id) && !narrowing();
    const needs = needsOf(x).filter((n) => n !== "customer");
    const name = `<a class="data-table-link est-name" href="#${x.id}" data-open-line="${x.id}">${esc(x.name)}</a>`;
    const flags = [
      x.autocost ? `<span class="badge est-tag" data-tip="Its price is kept up to date from the supplier">AutoCost</span>` : "",
      x.optional ? `<span class="badge est-tag" data-tone="${x.included ? "info" : ""}">${x.included ? "Optional, in" : "Optional"}</span>` : "",
    ].join("");
    const sub = flat ? `<span class="est-path">${pathOf(x).map((a) => esc(a.name)).join(" › ") || "The estimate"}</span>` : subOf(x);
    return `<tr data-id="${x.id}" data-kind="${x.kind}"${isA ? ` data-assembly` : ""}${sel ? " data-selected" : ""}${ui.open === x.id ? " data-open" : ""}${needs.length ? ` data-needs="${needs.join(" ")}"` : ""} style="--lvl:${lvl}">
      <td class="data-table-select"><input type="checkbox" class="checkbox" aria-label="Select ${esc(x.name)}"${sel ? " checked" : ""}${some ? " data-some" : ""}></td>
      <td data-primary data-m="title"><div class="est-cell">${isA && !flat ? `<button type="button" class="est-fold" data-fold="${x.id}" aria-expanded="${!folded}" aria-label="${folded ? "Unfold" : "Fold"} ${esc(x.name)}">${ic("chevron-down", 14)}</button>` : `<span class="est-fold-gap"></span>`}${thumbOf(x)}<div class="est-text"><div class="est-line">${name}${flags}</div>${sub ? `<div class="cell-sub est-sub"${x.kind === "item" && !flat ? " data-desc" : ""}>${sub}</div>` : ""}</div></div></td>
      <td data-numeric data-m="over" class="est-qty">${qtyCell(x)}${flags ? `<span class="est-qty-flags">${flags}</span>` : ""}</td>
      ${priceCells(x, t)}${extraCells(x, t)}
      <td class="row-actions"><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-row-menu="${x.id}" aria-label="Actions for ${esc(x.name)}" aria-haspopup="menu" aria-expanded="false" data-tip="Actions">${ic("ellipsis", 16)}</button></td>
    </tr>`;
  }
  const colCount = () => 6 + visibleCols().length - (ui.cols.margin ? 0 : 0);
  function addRowHtml(parent, lvl) {
    const where = parent ? parent.id : "root", open = ui.adding === where;
    const label = parent ? `Add to ${parent.name}` : "Add to the estimate";
    return `<tr class="est-add-row" style="--lvl:${lvl}" data-add-row="${where}"><td class="data-table-select"></td><td colspan="${colCount() - 1}" data-m="title"><div class="est-cell"><span class="est-fold-gap"></span>${open
      ? `<span class="est-kind" data-kind="new" aria-hidden="true">${ic("circle-plus", 14, { optical: true })}</span><input class="input est-add-input" data-size="sm" id="add-input" placeholder="Type a name, or search the catalog" aria-label="${esc(label)}" autocomplete="off" aria-autocomplete="list" aria-controls="pop" aria-expanded="false"><span class="est-add-hint">Enter adds a cost item</span>`
      : `<button type="button" class="est-add" data-add="${where}"><span class="est-add-mark" aria-hidden="true">${ic("circle-plus", 16)}</span><span>${esc(label)}</span></button>`}</div></td></tr>`;
  }

  function tableHtml() {
    const keep = shown(), vc = visibleCols();
    const head = `<thead><tr><th class="data-table-select"><input type="checkbox" class="checkbox" id="select-all" aria-label="Select every line"${ui.selected.size && ui.selected.size === order.length ? " checked" : ""}></th>
      <th data-primary data-m="title">${ui.group === "tree" ? "Project scope" : "Line"}</th><th data-numeric data-m="over">Qty</th><th data-numeric class="est-cost">Cost</th>${ui.cols.margin ? `<th data-numeric>Margin</th>` : ""}<th data-numeric data-m="trail">Price</th>${vc.filter((c) => c !== "margin").map((c) => `<th>${COLS[c]}</th>`).join("")}<th class="row-actions"><span class="visually-hidden">Actions</span></th></tr></thead>`;
    let body = "";
    if (ui.group === "tree") {
      const walk = (list, lvl, parent) => {
        list.forEach((x) => {
          if (keep && !keep.has(x.id)) return;
          body += rowHtml(x);
          if (x.children && !(ui.folded.has(x.id) && !keep)) { walk(x.children, lvl + 1, x); if (!keep && !ui.foldAssemblies) body += addRowHtml(x, lvl + 1); }
        });
      };
      if (ui.foldAssemblies && !keep) { order.filter((x) => x.kind === "assembly").forEach((x) => (body += rowHtml(x))); }
      else { walk(M.tree, 0, null); if (!keep) body += addRowHtml(null, 0); }
    } else {
      const lines = order.filter((x) => isLeaf(x) && (!keep || keep.has(x.id)));
      const groups = new Map();
      const keyOf = ui.group === "stage" ? (x) => x.stage || "General" : (x) => { if (x.kind === "fee") return "Fees"; const k = costKinds(x); return k.length ? k.map((p, i) => (i ? PART[p][0].toLowerCase() : PART[p][0])).join(" and ") : "No cost yet"; };
      lines.forEach((x) => { const k = keyOf(x); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); });
      const sortKeys = ui.group === "stage" ? E.STAGES.filter((s) => groups.has(s)) : [...groups.keys()];
      sortKeys.forEach((k) => {
        const xs = groups.get(k), price = xs.reduce((s, x) => s + (T.get(x.id)?.price || 0), 0), cost = xs.reduce((s, x) => s + (T.get(x.id)?.cost || 0), 0);
        body += `<tr class="group-row"><td colspan="${colCount()}"><div class="est-group"><span class="group-head"><b>${esc(k)}</b><span class="est-muted"> · ${plural(xs.length, "line")}</span></span><span class="est-group-sum">${money(cost)} cost · <b>${money(price)}</b></span></div></td></tr>`;
        xs.forEach((x) => (body += rowHtml(x, { flat: true })));
      });
    }
    if (!body.includes("data-id=")) body = `<tr class="est-none"><td colspan="${colCount()}"><div class="empty-state" data-size="sm"><p class="empty-state-title">No lines match</p><p class="text-secondary">Nothing in the estimate fits ${ui.search.trim() ? `“${esc(ui.search.trim())}”` : "these filters"}.</p><button type="button" class="button" data-variant="secondary" data-size="sm" data-clear-all>Clear filters</button></div></td></tr>`;
    return `<table class="data-table est-table" data-group="${ui.group}">${head}<tbody>${body}</tbody></table>`;
  }

  // ---------- the cards: what's left, then the money ----------
  function slicesHtml() {
    const leaves = order.filter(isLeaf);
    const cards = SLICES.map((s) => {
      const xs = leaves.filter((x) => needsOf(x).includes(s.key));
      // the card's value is its count of lines, so it shows no second, small count
      return `<button type="button" class="slice est-slice" data-slice="${s.key}" aria-pressed="${ui.slice === s.key}"${xs.length ? "" : " data-done"} data-tip="${esc(s.tip)}">
        <span class="slice-head"><span class="slice-label">${ic(s.icon, 14, { optical: true })}${s.label}</span></span>
        <span class="slice-value">${xs.length ? plural(xs.length, "line") : `${ic("check", 14)} None left`}</span></button>`;
    }).join("");
    const t = T.get("job"), c = t.cost || 1;
    const margin = t.price ? t.profit / t.price : 0;
    // the margin, as every insight card is drawn (summary-cards.css, the lists' win rate): its label and (?), the figure
    // with its note on one line, the split bar; what its colours are shows on hover, as a key in its tooltip (trying out,
    // your call, 30 Oct, D147), and the (?) note says it too, for touch
    const split = ["l", "m", "s"].map((k) => `${PART[k][0]} ${money(t[k], { whole: true })}`).join(" · ");
    const insight = `<div class="slice slice-insight est-money" role="group" aria-labelledby="margin-label"><div class="insight-primary">
      <span class="slice-head"><span class="slice-label" id="margin-label">Margin</span><button type="button" class="info-button" data-margin-info aria-label="How margin is worked out" aria-haspopup="dialog" aria-expanded="false" data-tip="How it's worked out">${ic("circle-help", 14)}</button></span>
      <span class="insight-main"><span class="slice-value">${pct(margin)}</span><span class="insight-counts">${money(t.profit, { whole: true })} profit on ${money(t.price, { whole: true })}</span></span>
      <div class="est-bar-hit" role="img" aria-label="${split}" data-tip="${split}"><template data-tip-html><dl class="tip-key">${["l", "m", "s"].map((k) => `<div data-part="${k}"><dt>${PART[k][0]}</dt><dd>${money(t[k], { whole: true })}</dd></div>`).join("")}</dl></template><div class="split-bar">${["l", "m", "s"].map((k) => `<span data-part="${k}" style="flex:${t[k] || 0}"></span>`).join("")}</div></div></div></div>`;
    return cards + insight;
  }

  function footHtml() {
    const t = T.get("job"), leaves = order.filter(isLeaf).length, asm = order.filter((x) => x.kind === "assembly").length;
    return `<span class="list-foot-range">${plural(leaves, "line")} in ${plural(asm, "assembly", "assemblies")}</span>
      <span class="est-totals">${[["Cost", t.cost], ["Profit", t.profit], ["Price", t.price]].map(([l, v]) => `<span class="est-fig" data-fig="${l.toLowerCase()}"><span class="est-fig-label">${l}</span> <b>${money(v)}</b></span>`).join("")}
      <button type="button" class="button est-fig" data-variant="secondary" data-size="sm" data-totals aria-haspopup="dialog" aria-expanded="false"><span class="est-fig-label">Total with tax</span> <b>${money(t.total)}</b>${ic("chevron-down", 12)}</button></span>`;
  }

  // ---------- the job's navigation ----------
  const NAV = [
    { items: [["overview", "Overview", "house"]] },
    { label: "Pre-production", items: [["estimate", "Estimate", "calculator"], ["dims", "Measurements", "ruler-combined"], ["proposal", "Proposal", "file-text"], ["selections", "Selections", "palette"]] },
    { label: "Production", items: [["change-orders", "Change orders", "file-signature"], ["schedule", "Schedule", "chart-gantt"], ["tasks", "Tasks", "square-check"], ["logs", "Daily logs", "clipboard-list"], ["budget", "Budget", "hand-dollar"], ["bids", "Bid requests", "send"], ["orders", "Vendor orders", "truck"], ["bills", "Bills and expenses", "receipt"], ["invoices", "Invoices", "file-invoice"], ["payments", "Payments", "credit-card"]] },
    { items: [["documents", "Documents", "folder"], ["messages", "Messages", "message"], ["settings", "Job settings", "settings"]] },
  ];
  function navHtml() {
    const custom = order.filter((x) => x.kind === "selection" && x.chooser === "customer").length;
    return NAV.map((g) => `${g.label ? `<p class="sidebar-group">${g.label}</p>` : ""}${g.items.map(([id, l, i]) => `<button type="button" class="sidebar-item" data-job-page="${id}"${id === "estimate" ? ' aria-current="page"' : ""}>${ic(i, 18)}<span>${l}</span>${id === "dims" ? `<span class="badge" data-count>${M.dims.length}</span>` : id === "selections" ? `<span class="badge" data-count>${custom}</span>` : ""}</button>`).join("")}`).join("");
  }

  // ---------- render ----------
  function render() {
    const wrap = $("#est-wrap");
    const focusKey = document.activeElement?.closest?.("[data-focus-key]")?.dataset.focusKey;
    wrap.innerHTML = ui.loading ? skeletonHtml() : ui.failed ? "" : tableHtml();
    $("#slices").innerHTML = slicesHtml();
    $("#est-foot").innerHTML = footHtml();
    // Measurements is an icon in the table's toolbar: a count at its corner while some are left to take, in its name too
    const toTake = M.dims.filter((d) => d.value == null).length, dimsName = toTake ? `Measurements, ${toTake} to take` : "Measurements";
    $("#dims-count").textContent = toTake; $("#dims-count").hidden = !toTake;
    $("#open-dims").setAttribute("aria-label", dimsName); $("#open-dims").dataset.tip = dimsName;
    $("#est-meta").textContent = M.sent ? (M.sent.changes ? `Sent Oct 29 · ${plural(M.sent.changes, "change")} since` : "Sent Oct 29") : "Draft · not sent yet";
    $("#job-status").textContent = M.sent ? "Pending" : "Draft";
    $("#job-status").dataset.status = M.sent ? "pending" : "draft";
    $("#send span").textContent = M.sent ? (M.sent.changes ? "Resend estimate" : "Sent") : "Send estimate";
    chips(); bulkBar(); highlight();
    $$("input[data-some]").forEach((c) => (c.indeterminate = true));
    const all = $("#select-all"); if (all) all.indeterminate = ui.selected.size > 0 && ui.selected.size < order.length;
    if (ui.open) renderRecord();
    if (ui.adding) { const inp = $("#add-input"); if (inp && document.activeElement !== inp) { inp.value = addText; inp.focus(); } }
    if (focusKey) $(`[data-focus-key="${focusKey}"]`)?.focus({ preventScroll: true });
  }
  const skeletonHtml = () => `<div class="est-skeleton" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<div class="est-skeleton-row" style="--lvl:${[0, 0, 1, 1, 1, 2, 2, 1, 0][i]}"><span class="skeleton" data-shape="check"></span><span class="skeleton" style="inline-size:${[14, 11, 16, 12, 18, 10, 13, 15, 9][i]}rem"></span><span class="skeleton" style="inline-size:4rem;margin-inline-start:auto"></span><span class="skeleton" style="inline-size:5rem"></span><span class="skeleton" style="inline-size:5rem"></span></div>`).join("")}</div>`;

  // search hits marked in the names and the lines under them (the system's search-hit highlight)
  function highlight() {
    if (!window.Highlight || !CSS.highlights) return;
    CSS.highlights.delete("search-hit");
    const q = ui.search.trim().toLowerCase();
    if (!q) return;
    const ranges = [];
    $$("#est-wrap :is(.est-name, .est-sub)").forEach((el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const s = n.textContent.toLowerCase(); let i = s.indexOf(q);
        while (i >= 0) { const r = new Range(); r.setStart(n, i); r.setEnd(n, i + q.length); ranges.push(r); i = s.indexOf(q, i + q.length); }
      }
    });
    CSS.highlights.set("search-hit", new Highlight(...ranges));
  }

  // ---------- filters and chips ----------
  const FILTERS = {
    kind: { label: "Kind", options: () => Object.entries(KINDS).filter(([k]) => k !== "assembly").map(([k, l]) => [k, l, KIND_ICON[k]]) },
    cost: { label: "Cost type", options: () => Object.entries(PART).map(([k, [l, i]]) => [k, l, i]) },
    stage: { label: "Stage", options: () => E.STAGES.map((s) => [s, s]) },
    assignee: { label: "Assigned to", options: () => [...E.TEAM.map((t) => [t.id, t.name]), ["none", "Nobody yet"]] },
  };
  function chips() {
    const parts = [];
    if (ui.slice) parts.push(`<span class="chip" data-active><button type="button" class="chip-main" data-slice="${ui.slice}"><span class="chip-field">Left</span><span class="chip-value">${SLICES.find((s) => s.key === ui.slice).label}</span></button><button type="button" class="chip-remove" data-clear-slice aria-label="Remove the Left filter">${ic("xmark", 14)}</button></span>`);
    if (ui.search.trim()) parts.push(`<span class="chip" data-active><button type="button" class="chip-main" data-focus-search><span class="chip-field">Search</span><span class="chip-value">“${esc(ui.search.trim())}”</span></button><button type="button" class="chip-remove" data-clear-search aria-label="Clear the search">${ic("xmark", 14)}</button></span>`);
    Object.entries(ui.filters).forEach(([k, set]) => {
      if (!set.size) return;
      const names = FILTERS[k].options().filter(([v]) => set.has(v)).map(([, l]) => l);
      parts.push(`<span class="chip" data-active><button type="button" class="chip-main" data-filter="${k}" aria-haspopup="dialog" aria-expanded="false"><span class="chip-field">${FILTERS[k].label}</span><span class="chip-value">${esc(names.join(", "))}</span></button><button type="button" class="chip-remove" data-clear-filter="${k}" aria-label="Remove the ${FILTERS[k].label} filter">${ic("xmark", 14)}</button></span>`);
    });
    const on = parts.length > 0;
    $("#list-chips").hidden = !on;
    if (!on) return;
    const keep = shown(), n = order.filter((x) => isLeaf(x) && keep?.has(x.id) && passes(x)).length;
    $("#result-count").textContent = `${n} of ${plural(order.filter(isLeaf).length, "line")}`;
    $("#filters").innerHTML = parts.join("") + `<button type="button" class="link-button" data-clear-all>Clear all</button>`;
  }

  // ---------- the popover: menus, pickers, the totals, the add field's suggestions ----------
  const pop = $("#pop");
  let popFor = null;
  function hostPop() { const host = $("dialog.peek[open]") || $("#send-dialog[open]") || $("#job"); if (pop.parentElement !== host) { if (pop.matches(":popover-open")) pop.hidePopover(); host.append(pop); } }
  function openPop(kind, from, html, { role = "menu", label = "", end = false, focus = true, wide = false } = {}) {
    hostPop();
    if (pop.matches(":popover-open")) pop.hidePopover();
    popFor = { kind, from };
    pop.setAttribute("role", role);
    pop.setAttribute("aria-label", label);
    pop.toggleAttribute("data-wide", wide);
    pop.innerHTML = html;
    pop.showPopover();
    $$("[aria-expanded='true'][aria-haspopup]").forEach((b) => b !== from && b.setAttribute("aria-expanded", "false"));
    from?.setAttribute("aria-expanded", "true");
    place(end);
    if (focus) ($("input:not([type=hidden]), [role^=menuitem], button", pop) || pop).focus({ preventScroll: true });
  }
  function place(end) {
    const a = popFor?.from;
    if (!a || matchMedia("(max-width: 767px)").matches) { pop.style.left = pop.style.top = ""; return; }
    const r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let left = end ? r.right - w : r.left;
    left = Math.max(12, Math.min(left, innerWidth - w - 12));
    let top = r.bottom + 4;
    if (top + h > innerHeight - 12 && r.top - h - 4 > 12) top = r.top - h - 4;
    pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  }
  pop.addEventListener("toggle", (e) => { if (e.newState === "closed") { popFor?.from?.setAttribute("aria-expanded", "false"); if (popFor?.kind === "add") $("#add-input")?.setAttribute("aria-expanded", "false"); popFor = null; } });
  const closePop = () => pop.matches(":popover-open") && pop.hidePopover();
  const mi = (attrs, label, icon, o = {}) => `<button type="button" class="menu-item" role="${o.role || "menuitem"}"${o.checked != null ? ` aria-checked="${o.checked}"` : ""} ${attrs}${o.tone ? ` data-tone="${o.tone}"` : ""}>${icon ? `<span class="menu-icon">${ic(icon, 14, { optical: true })}</span>` : ""}<span class="est-mi-label">${label}</span>${o.hint ? `<span class="est-mi-hint">${o.hint}</span>` : ""}</button>`; // a checked item's tick is the menu's (menu.css)

  function filterPicker(key, from) {
    const f = FILTERS[key], set = ui.filters[key];
    openPop("filter", from, `<div class="pop-head"><h3>${f.label}</h3></div><div class="pop-body">${f.options().map(([v, l, i]) => `<label class="option"><input type="checkbox" class="checkbox" data-pick="${key}" value="${esc(v)}"${set.has(v) ? " checked" : ""}><span class="option-label">${i ? ic(i, 14, { optical: true }) : ""}${esc(l)}</span><span class="option-count">${order.filter((x) => isLeaf(x) && (key === "kind" ? kindKey(x) === v : key === "cost" ? costKinds(x).includes(v) : key === "stage" ? x.stage === v : (x.assignee || "none") === v)).length}</span></label>`).join("")}</div>`, { role: "dialog", label: `Filter by ${f.label.toLowerCase()}` });
  }
  function addFilterMenu(from) {
    openPop("add-filter", from, `<div class="pop-body">${Object.entries(FILTERS).map(([k, f]) => mi(`data-pick-filter="${k}"`, f.label, k === "kind" ? "toolbox" : k === "cost" ? "toolbox" : k === "stage" ? "status" : "user", { hint: ui.filters[k].size ? `${ui.filters[k].size} on` : "" })).join("")}</div>`, { label: "Add a filter" });
  }
  function displayMenu(from) {
    const g = (v, l) => mi(`data-group="${v}"`, l, null, { role: "menuitemradio", checked: ui.group === v });
    const c = (k) => mi(`data-col="${k}"`, COLS[k], null, { role: "menuitemcheckbox", checked: ui.cols[k] });
    // folding the whole tree lives here, with the grouping it belongs to; each assembly's chevron folds it alone
    const f = (v, l) => mi(`data-fold-to="${v}"`, l, null, { role: "menuitemradio", checked: !!ui.foldAssemblies === (v === "assemblies") });
    openPop("display", from, `<div class="pop-body"><p class="pop-section">Group by</p>${g("tree", "Assembly")}${g("stage", "Stage")}${g("cost", "Cost type")}${ui.group === "tree" ? `<hr><p class="pop-section">Show</p>${f("all", "Every line")}${f("assemblies", "Assemblies only")}` : ""}<hr><p class="pop-section">Columns</p>${Object.keys(COLS).map(c).join("")}</div>`, { label: "Display settings", end: true });
  }
  function totalsPop(from) {
    const t = T.get("job"), row = (l, v, o = "") => `<div class="est-tot-row"${o}><dt>${l}</dt><dd>${v}</dd></div>`;
    openPop("totals", from, `<div class="pop-head"><h3>The job's totals</h3></div><div class="pop-body est-tot"><dl>
      ${row(`${ic("hard-hat", 12)} Labor`, money(t.l))}${row(`${ic("box", 12)} Materials`, money(t.m))}${row(`${ic("handshake", 12)} Subcontracted`, money(t.s))}
      ${row("<b>Cost</b>", `<b>${money(t.cost)}</b>`, ' data-rule')}${row(`Profit <span class="est-muted">${t.price ? pct(t.profit / t.price) : "—"} margin</span>`, money(t.profit))}
      ${row("<b>Price</b>", `<b>${money(t.price)}</b>`, ' data-rule')}
      <div class="est-tot-row"><dt><label for="tot-discount">Discount</label></dt><dd><span class="input-group" data-size="sm"><span class="input-adornment">$</span><input class="input" data-size="sm" id="tot-discount" inputmode="decimal" value="${t.discount ? t.discount.toFixed(2) : ""}" placeholder="0.00" aria-describedby="tot-discount-help"></span></dd></div>
      ${row("Subtotal", money(t.subtotal))}${row(`Tax <span class="est-muted">Austin, TX ${pct(M.job.tax)}</span>`, money(t.tax))}
      ${row("<b>Total with tax</b>", `<b>${money(t.total)}</b>`, ' data-rule data-strong')}</dl>
      <p class="est-muted est-tot-help" id="tot-discount-help">The discount comes off the price; line prices stay as they are.</p></div>`, { role: "dialog", label: "The job's totals", end: true, focus: false });
  }

  // ---------- the record: one for every kind of line ----------
  const wideRecord = () => matchMedia("(min-width: 1280px)").matches;
  const host = () => (wideRecord() ? $("#detail") : $("#peek"));
  function openRecord(id, { focus = "title", edit = null } = {}) {
    if (id !== ui.open) { ui.revealed = new Set(); ui.revealing = null; }
    ui.open = id; ui.edit = edit;
    $("#list-split").toggleAttribute("data-open", wideRecord());
    if (wideRecord()) { $("#detail").hidden = false; if ($("#peek").open) $("#peek").close(); }
    else { $("#detail").hidden = true; if (!$("#peek").open) $("#peek").showModal(); }
    // a line opens with what its row says at once; the rest waits as the network does (D142)
    const h = host();
    h.innerHTML = recordHtml(id);
    $$("#est-wrap tr[data-open]").forEach((r) => r.removeAttribute("data-open"));
    $(`#est-wrap tr[data-id="${id}"]`)?.setAttribute("data-open", "");
    if (focus === "title") { const t = $("#detail-title", h); t?.setAttribute("data-quiet-focus", ""); t?.focus({ preventScroll: true }); }
    if (edit) { const f = $("[data-editor] :is(input, select, textarea)", h); f?.focus(); f?.select?.(); }
    if (net !== "0" && id !== "dims") {
      const body = $(".est-rec-body", h);
      BolsterLoading.load(body, () => wire(), { label: "the line", skeleton: () => `<div class="detail-section skeleton-stack">${[10, 14, 8, 12, 16, 9].map((w) => `<span class="skeleton" style="inline-size:${w}rem"></span>`).join("")}</div>`, render: () => renderRecord(), error: () => `<div class="detail-section"><div class="banner" role="alert"><p>This line didn't load. Check your connection and try again.</p><button type="button" class="button" data-variant="secondary" data-size="sm" data-retry-record>Try again</button></div></div>` });
    }
  }
  function closeRecord() {
    const id = ui.open;
    ui.open = null; ui.edit = null;
    $("#list-split").removeAttribute("data-open");
    $("#detail").hidden = true;
    if ($("#peek").open) $("#peek").close();
    $$("#est-wrap tr[data-open]").forEach((r) => r.removeAttribute("data-open"));
    $(`#est-wrap [data-open-line="${id}"]`)?.focus({ preventScroll: true });
  }
  function renderRecord() {
    const h = host(); if (!h || !ui.open) return;
    if (ui.open !== "dims" && !byId.has(ui.open)) return closeRecord();
    const scroll = $(".detail-scroll", h)?.scrollTop || 0;
    const active = document.activeElement, key = active?.dataset?.focusKey, inEditor = active?.closest?.("[data-editor]");
    h.innerHTML = recordHtml(ui.open);
    $(".detail-scroll", h).scrollTop = scroll;
    if (ui.edit && !inEditor) { const f = $("[data-editor] :is(input, select, textarea)", h); f?.focus({ preventScroll: true }); f?.select?.(); }
    else if (key) $(`[data-focus-key="${key}"]`, h)?.focus({ preventScroll: true });
    $$("input[data-some]", h).forEach((c) => (c.indeterminate = true));
  }

  // a record row (C-read): the label, the value; a click turns it into its field (C-edit) or its small form
  // (C-together). Empty values say what they're for (C-empty), or, when they're rarely set, wait as a chip naming them
  // at the section's foot, which opens that one value's field (as Bolster's item editor reveals its fields).
  // each label carries its field's icon, a step quieter than its words (as Attio's records read): the system's icon for
  // the field's meaning, else its type's (system/model/icons.json, L-icons); a field without one has none. What the
  // record works out from the others (price per unit, total) takes the calculator, so it reads apart from what's typed
  const FIELD_ICON = {
    qty: "hashtag", aqty: "hashtag", unit: "ruler", cost: "dollar", unitcost: "dollar", unitprice: "calculator", total: "calculator",
    minspend: "dollar", price: "dollar", margin: "percent", amargin: "percent", rate: "percent", taxrate: "percent",
    assignee: "user", chooser: "user", stage: "tag", category: "tag", budget: "tag", buy: "tag", duration: "clock",
    vendor: "store", sku: "text", desc: "text", notes: "text", base: "tag",
    optional: "square-check", custqty: "square-check", lock: "square-check", upgrade: "palette", catalog: "book-open",
  };
  const rlabel = (key, label, id) => `<div class="detail-label"${id ? ` id="${id}"` : ""}>${FIELD_ICON[key] ? ic(FIELD_ICON[key], 12, { optical: true }) : ""}<span>${label}</span></div>`;
  function row(key, label, value, o = {}) {
    if (ui.edit === key) return `<div class="detail-row" data-editing data-row="${key}">${rlabel(key, label, `lbl-${key}`)}<div class="detail-editor" data-editor="${key}">${o.editor()}</div></div>`;
    const empty = value == null || value === "";
    const shown = empty ? (o.prompt ? `<span class="detail-prompt">${o.prompt}</span>` : `<span class="est-muted">—</span>`) : value;
    const editable = !!o.editor;
    return `<div class="detail-row" data-row="${key}"${o.wide ? " data-wide" : ""}>${rlabel(key, label)}${editable ? `<button type="button" class="detail-value" data-edit="${key}" data-focus-key="v-${key}" aria-label="${esc(o.aria || `${stripTags(label)}: ${stripTags(empty ? o.prompt || "none" : value)}. Edit`)}">${shown}<span class="detail-pencil" aria-hidden="true">${ic("pen", 12)}</span></button>` : `<div class="detail-value" data-static>${shown}</div>`}${o.note ? `<p class="detail-row-note">${o.note}</p>` : ""}</div>`;
  }
  const stripTags = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  function section(key, title, rows, hidden = []) {
    const rowKey = (h) => h.match(/data-row="([^"]+)"/)?.[1];
    const rowLabel = (h) => stripTags(h.match(/class="detail-label"[^>]*>([\s\S]*?)<\/div>/)?.[1]);
    const extra = hidden.filter(Boolean), shown = extra.filter((h) => ui.revealed.has(rowKey(h)) || ui.edit === rowKey(h)), waiting = extra.filter((h) => !shown.includes(h));
    const chips = waiting.length ? `<div class="detail-reveal" role="group" aria-label="More for ${esc(stripTags(title).toLowerCase())}">${waiting.map((h) => `<span class="chip"><button type="button" class="chip-main" data-reveal="${rowKey(h)}" data-focus-key="reveal-${rowKey(h)}">+ ${esc(rowLabel(h))}</button></span>`).join("")}</div>` : "";
    return `<section class="detail-section" aria-labelledby="sec-${key}"><h3 class="detail-section-title" id="sec-${key}">${title}</h3>${rows.filter(Boolean).join("")}${shown.join("")}${chips}</section>`;
  }
  const field = (id, label, input, o = {}) => `<div class="field" data-size="sm"${o.width ? ` style="--_w:${o.width}ch"` : ""}><label class="field-label" for="${id}">${label}</label>${o.hint ? `<p class="field-helper" id="${id}-hint">${o.hint}</p>` : ""}${input}${o.error ? `<p class="field-error" id="${id}-error">${ic("triangle-exclamation", 12)}${o.error}</p>` : ""}</div>`;
  const editorFoot = (o = {}) => `<div class="detail-editor-foot"><button type="submit" class="button" data-size="sm">${o.save || "Save"}</button><button type="button" class="button" data-variant="ghost" data-size="sm" data-cancel>Cancel</button>${o.extra || ""}</div>`;
  const moneyInput = (id, v, o = {}) => `<span class="input-group" data-size="sm"><span class="input-adornment">$</span><input class="input" data-size="sm" id="${id}" name="${o.name || id}" inputmode="decimal" value="${v == null ? "" : Number(v).toFixed(2)}"${o.disabled ? " disabled" : ""}${o.label ? ` aria-label="${esc(o.label)}"` : ""}${o.describedby ? ` aria-describedby="${o.describedby}"` : ""}></span>`;
  const pctInput = (id, v) => `<span class="input-group" data-size="sm"><input class="input" data-size="sm" id="${id}" name="${id}" inputmode="decimal" value="${v == null ? "" : Math.round(v * 1000) / 10}"><span class="input-adornment">%</span></span>`;
  const select = (id, opts, v, o = {}) => `<div class="select" data-size="sm"><select class="input" data-size="sm" id="${id}" name="${o.name || id}">${opts.map(([val, l]) => `<option value="${esc(val)}"${String(val) === String(v ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;

  // ---------- the comfortable record (trying out, Concept controls → Record) ----------
  // For readers who need it bigger and plainer: the head answers what the customer pays and what you make, in three
  // labelled figures that never change place. A figure is a sum, a range (a customer's choice), not yet (a dash; the
  // need under it says why) or a loss (red, with a minus); at most one note says what's unusual, from a closed list.
  const comfy = () => document.documentElement.dataset.record === "comfortable";
  const span = ([a, b]) => (Math.abs(a - b) < 0.005 ? money(a) : `${money(a)}–<wbr>${money(b)}`);
  // a customer's choice at this line's quantity, every option: [cheapest, dearest] for its cost, price and profit
  function choiceRange(x) {
    const t = T.get(x.id) || {}, qty = (t.qty ?? 0) * pathOf(x).reduce((m, a) => m * (a.qty ?? 1), 1);
    const all = x.options.map((o) => { const p = o.c || {}, cost = ((p.m ?? 0) + (p.l ?? 0) + (p.s ?? 0)) * qty, price = priceOf(cost, x.margin ?? 0); return { cost, price, profit: price - cost }; });
    const by = (k) => [Math.min(...all.map((a) => a[k])), Math.max(...all.map((a) => a[k]))];
    return { cost: by("cost"), price: by("price"), profit: by("profit") };
  }
  function summaryOf(x, need) {
    const t = T.get(x.id) || {}, tt = included(x) ? t : t.out || t;
    const s = { pays: money(tt.price), cost: money(tt.cost), profit: tt.price - tt.cost, pct: tt.price ? (tt.price - tt.cost) / tt.price : null, note: null };
    const sel = x.kind === "selection", out = !included(x);
    if (x.kind === "fee") {
      const base = { cost: "cost", price: "price", labor: "labor cost" }[x.base] || "cost";
      s.note = `${num(x.rate)}% of the project's ${base}, so it follows the project as it changes`;
      return s;
    }
    if (x.kind === "assembly") {
      // a customer's choice inside makes the assembly a range too: what it adds at its cheapest and dearest
      const picks = descendants(x).filter((d) => d.kind === "selection" && d.chooser === "customer" && included(d) && optionOf(d));
      if (picks.length && !out) {
        const lo = { cost: tt.cost, price: tt.price }, hi = { ...lo };
        picks.forEach((d) => { const r = choiceRange(d), dt = T.get(d.id) || {}; ["cost", "price"].forEach((k) => { lo[k] += r[k][0] - dt[k]; hi[k] += r[k][1] - dt[k]; }); });
        Object.assign(s, { pays: span([lo.price, hi.price]), cost: span([lo.cost, hi.cost]), profit: [lo.price - lo.cost, hi.price - hi.cost], pct: null });
      }
      const mr = marginRange(x);
      s.note = out ? "Optional: only in the total if Marco adds it"
        : picks.length ? `Marco picks ${picks.length === 1 ? "an option" : `${picks.length} options`} in it on the proposal`
        : mr.includes("–") ? `Its lines have different margins, ${mr}` : null;
      return s;
    }
    // a line that can't be priced yet: the need under the figures says what's missing
    if (need?.action) return { pays: null, cost: null, profit: null, pct: null, note: null };
    if (sel && x.chooser === "customer" && !out) {
      const r = choiceRange(x);
      Object.assign(s, { pays: span(r.price), cost: span(r.cost), profit: r.profit, pct: null });
      return s; // what Marco starts from is the need's to say, under the figures
    }
    const roundedUp = x.buy && t.buy && t.buy * x.buy.size > (t.qty ?? 0) + 1e-9;
    s.note = out ? "Optional: only in the total if Marco adds it"
      : roundedUp ? `Bought as ${plural(t.buy, x.buy.by)}, rounded up`
      : x.minSpend ? `Never priced below ${money(x.minSpend)}`
      : x.taxRate != null ? `Plus ${pct(x.taxRate)} tax`
      : !x.margin ? "Sold at cost: no profit on it" : null;
    return s;
  }
  function summaryHtml(s) {
    const dash = `<span class="est-sum-none">—</span>`;
    const pr = s.profit;
    // profit in green, a loss in red with a minus, nothing made in the plain ink
    const tone = (v) => (v < -0.005 ? ` data-tone="loss"` : v > 0.005 ? ` data-tone="profit"` : "");
    const profit = pr == null ? dash : Array.isArray(pr) ? `<span${tone(pr[0])}>${span(pr).replace(/-\$/g, "−$")}</span>`
      : pr < -0.005 ? `<span data-tone="loss">−${money(-pr)}</span>` : `<span${tone(pr)}>${money(pr)}</span>`;
    const share = pr != null && !Array.isArray(pr) && s.pct != null && Math.abs(pr) > 0.005 ? ` <span class="est-sum-pct">${pct(s.pct)} of the price</span>` : "";
    return `<div class="est-sum" role="group" aria-label="Summary">
      <p class="est-sum-pays"><span class="est-sum-label">Customer pays</span><span class="est-sum-big">${s.pays ?? dash}</span></p>
      <dl class="est-sum-parts"><div><dt>Your cost</dt><dd>${s.cost ?? dash}</dd></div><div><dt>Your profit${share}</dt><dd>${profit}</dd></div></dl>
      ${s.note ? `<p class="est-sum-note">${s.note}</p>` : ""}</div>`;
  }

  function headHtml(x, kindLine, facts, need) {
    return `<header class="detail-head"><h2 id="detail-title" tabindex="-1">${esc(x.name)}</h2>
      <button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-rec-menu aria-label="More for this line" aria-haspopup="menu" aria-expanded="false" data-tip="More">${ic("ellipsis", 16)}</button>
      <button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-close-record aria-label="Close" data-tip="Close">${ic("xmark", 16)}</button></header>
      <div class="detail-scroll"><div class="detail-section detail-hero est-hero">${photoHtml(x)}
        <p class="est-hero-kind">${kindTile(x)}<span>${kindLine}</span></p>
        ${pathOf(x).length ? `<nav class="est-crumbs" aria-label="Where it sits">${pathOf(x).map((a) => `<button type="button" class="link-button" data-open-line="${a.id}">${esc(a.name)}</button>`).join(`<span aria-hidden="true">›</span>`)}</nav>` : ""}
        ${ui.edit === "name" ? `<form class="est-name-edit" data-editor="name" novalidate>${field("ed-name", "Name", `<input class="input" data-size="sm" id="ed-name" name="name" value="${esc(x.name)}" required>`)}${editorFoot()}</form>` : `<button type="button" class="est-hero-name" data-edit="name" data-focus-key="v-name" aria-label="Name: ${esc(x.name)}. Edit">${esc(x.name)}<span class="detail-pencil" aria-hidden="true">${ic("pen", 12)}</span></button>`}
        ${comfy() ? summaryHtml(summaryOf(x, need)) : `<dl class="est-facts">${facts.map(([l, v, o]) => `<div${o ? ` data-${o}` : ""}><dt>${l}</dt><dd>${v}</dd></div>`).join("")}</dl>`}
        ${need ? `<div class="est-need" role="note">${ic(need.icon || "circle-help", 14)}<p>${need.text}</p>${need.action ? `<button type="button" class="button" data-variant="secondary" data-size="sm" ${need.action[1]}>${need.action[0]}</button>` : ""}</div>` : ""}
      </div><div class="est-rec-body">`;
  }
  const tailHtml = () => `</div></div>`;

  function recordHtml(id) {
    if (id === "dims") return dimsHtml();
    const x = byId.get(id), t = T.get(x.id) || {};
    if (x.kind === "assembly") return assemblyHtml(x, t);
    if (x.kind === "fee") return feeHtml(x, t);
    return lineHtml(x, t);
  }
  const outFact = (x, t) => (included(x) ? money(t.price) : `<span class="est-muted">Not included</span>`);

  // a cost item or a selection
  function lineHtml(x, t) {
    const q = qtyOf(x), sel = x.kind === "selection", o = optionOf(x), parts = costKinds(x), tt = included(x) ? t : t.out || t;
    const kindLine = sel ? (x.chooser === "customer" ? `Customer's choice · Marco picks on the proposal` : `Your choice · hidden from the proposal`) : `Cost item${parts.length ? ` · ${parts.map((k) => PART[k][0].toLowerCase()).join(", ").replace(/^./, (c) => c.toUpperCase())}` : ""}`;
    const qv = q.value != null && q.value !== 0 ? `${num(q.value)} ${esc(x.unit)}` : `<span class="est-todo">Not set</span>`;
    const facts = [["Quantity", qv], ["Cost", included(x) ? money(tt.cost) : "—"], ["Margin", pct(x.margin ?? 0)], ["Price", outFact(x, tt), "strong"]];
    let need = null;
    if (sel && x.chooser === "you" && x.current == null) need = { icon: "grid", text: "<b>Choose an option.</b> Nothing's priced until you do; Marco doesn't see this choice.", action: ["Choose", `data-goto-row="options"`] };
    else if (q.value == null || q.value === 0) need = { icon: "ruler-combined", text: q.missing ? `<b>Take the ${q.missing.map((c) => esc(dimByCode(c)?.name.toLowerCase() || c)).join(", ")}.</b> The quantity is worked out from it.` : `<b>Set the quantity.</b> The line prices at nothing until it has one.`, action: q.missing ? ["Add measurement", `data-edit-dim="${q.missing[0]}"`] : ["Set quantity", `data-edit-go="qty"`] };
    else if (included(x) && unitCost(x) === 0) need = { icon: "dollar", text: `<b>No cost yet.</b> ${x.vendor ? `Waiting on ${esc(x.vendor)}'s price.` : "Add what it costs you."}`, action: ["Add cost", `data-edit-go="cost"`] };
    else if (sel && x.chooser === "customer") need = { icon: "palette", text: `Marco starts from <b>${esc(o?.name || "—")}</b>${x.options.length > 1 ? ` and can switch to ${plural(x.options.length - 1, "other option")}` : ""} on the proposal.` };
    let h = headHtml(x, kindLine, facts, need);
    if (sel) h += optionsSection(x);
    h += quantitySection(x, q);
    h += pricingSection(x, tt, sel);
    h += customerSection(x, sel);
    h += productionSection(x);
    if (!sel) h += catalogSection(x);
    return h + tailHtml();
  }

  function quantitySection(x, q) {
    const uses = x.formula ? E.usesOf(x.formula).map(dimByCode).filter(Boolean) : [];
    const from = uses.length ? `<span class="detail-value-sub">from ${uses.map((d) => `${esc(d.name.toLowerCase())}${d.value == null ? " (not taken)" : `, ${num(d.value)} ${esc(d.unit)}`}`).join(" and ")}</span>` : "";
    const qv = q.value != null && q.value !== 0 ? `${num(q.value)} ${esc(x.unit)}${from}` : null;
    const rows = [
      row("qty", "Quantity", qv, { prompt: q.missing ? `Take the ${esc(dimByCode(q.missing[0])?.name.toLowerCase())} first` : "Set the quantity · needed to price it", editor: () => qtyEditor(x), aria: `Quantity: ${stripTags(qv || "not set")}. Edit` }),
      row("unit", "Unit", esc(x.unit), { editor: () => `<form data-editor="unit" novalidate>${field("ed-unit", "Unit", select("ed-unit", E.UNITS.map((u) => [u, u]), x.unit, { name: "unit" }))}${editorFoot()}</form>` }),
    ];
    const t = T.get(x.id) || {};
    const buy = x.buy ? `By the ${num(x.buy.size)} ${esc(x.unit)} ${esc(x.buy.by)} at ${money(x.buy.price)}${x.buy.waste ? `, ${x.buy.waste}% waste` : ""}<span class="detail-value-sub">${plural(t.buy ?? 0, x.buy.by)} to buy: ${money(t.buy * x.buy.price)}</span>` : null;
    const hidden = [];
    if (x.kind === "item" && partsOf(x).m != null) (x.buy ? rows : hidden).push(row("buy", "How it's bought", buy, { prompt: "By the unit · add a pack or piece size and waste", editor: () => buyEditor(x) }));
    hidden.push(row("custqty", comfy() ? "Let the customer change the quantity" : "Customer can change it", x.custQty ? "Yes, on the proposal" : null, { editor: () => yesNo("custqty", "Customer can change the quantity", x.custQty, "Yes, on the proposal", "No") }));
    return section("qty", "Quantity", rows, hidden);
  }
  function qtyEditor(x) {
    const usesFormula = !!x.formula, q = qtyOf(x);
    const dims = M.dims.map((d) => `<button type="button" class="est-dim-chip" data-insert="${d.code}"${d.value == null ? " data-missing" : ""} aria-label="Insert ${esc(d.name)} (${d.code})"><code>${d.code}</code>${esc(d.name)} <span class="est-muted">${d.value == null ? "not taken" : `${num(d.value)} ${esc(d.unit)}`}</span></button>`).join("");
    return `<form data-editor="qty" novalidate>
      <div class="segmented" role="radiogroup" aria-label="How the quantity is set" data-size="sm"><label class="segmented-option"><input type="radio" name="how" value="typed"${usesFormula ? "" : " checked"}> Type it</label><label class="segmented-option"><input type="radio" name="how" value="formula"${usesFormula ? " checked" : ""}> From measurements</label></div>
      <div class="est-qty-typed"${usesFormula ? " hidden" : ""}>${field("ed-qty", `Quantity, in ${esc(x.unit)}`, `<input class="input" data-size="sm" id="ed-qty" name="qty" inputmode="decimal" value="${x.formula ? q.value ?? "" : x.qty ?? ""}" aria-describedby="ed-qty-error">`, { width: 12 })}<p class="field-error" id="ed-qty-error" hidden></p></div>
      <div class="est-qty-formula"${usesFormula ? "" : " hidden"}>${field("ed-formula", "Formula", `<input class="input est-mono" data-size="sm" id="ed-formula" name="formula" value="${esc(x.formula || "")}" spellcheck="false" autocomplete="off" aria-describedby="ed-formula-hint ed-formula-out">`, { hint: "Measurement codes, numbers, + − * / and ceil( ), round( )" })}
        <p class="est-formula-out" id="ed-formula-out" aria-live="polite">${formulaOut(x.formula || "", x.unit)}</p>
        <div class="est-dim-chips" role="group" aria-label="The job's measurements">${dims}</div></div>
      ${editorFoot()}</form>`;
  }
  function formulaOut(expr, unit) {
    if (!expr.trim()) return `<span class="est-muted">Type a formula, or pick a measurement below</span>`;
    const r = E.evalFormula(expr, M.dims);
    if (r.error) return `<span class="est-err">${ic("triangle-exclamation", 12)}${esc(r.error)}</span>`;
    if (r.missing) return `<span class="est-todo">Needs the ${r.missing.map((c) => esc(dimByCode(c)?.name.toLowerCase() || c)).join(", ")}, which hasn't been taken</span>`;
    return `= <b>${num(r.value)} ${esc(unit)}</b>`;
  }
  function buyEditor(x) {
    const b = x.buy || { by: "piece", size: "", price: "", waste: 0 };
    return `<form data-editor="buy" novalidate><div class="est-form-row">${field("ed-buy-by", "Bought by the", select("ed-buy-by", ["piece", "pack", "box", "roll", "sheet", "bundle"].map((u) => [u, u]), b.by, { name: "by" }))}${field("ed-buy-size", `${esc(x.unit)} in one`, `<input class="input" data-size="sm" id="ed-buy-size" name="size" inputmode="decimal" value="${b.size}">`)}</div>
      <div class="est-form-row">${field("ed-buy-price", "Each one costs", moneyInput("ed-buy-price", b.price, { name: "price" }))}${field("ed-buy-waste", "Waste", `<span class="input-group" data-size="sm"><input class="input" data-size="sm" id="ed-buy-waste" name="waste" inputmode="decimal" value="${b.waste}"><span class="input-adornment">%</span></span>`)}</div>
      <p class="detail-row-note">The materials cost rounds up to whole ${esc(b.by)}s, after waste.</p>${editorFoot({ extra: x.buy ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-clear-buy>By the unit instead</button>` : "" })}</form>`;
  }

  function pricingSection(x, t, sel) {
    const p = partsOf(x), parts = costKinds(x);
    const uc = unitCost(x);
    const costV = sel ? (optionOf(x) ? `${money(uc)} / ${esc(x.unit)}<span class="detail-value-sub">from the current option${parts.length ? ` · ${parts.map((k) => PART[k][0].toLowerCase()).join(", ")}` : ""}</span>` : null)
      : parts.length ? `${money(uc)} / ${esc(x.unit)}${comfy() && parts.length === 1 ? "" : `<span class="detail-value-sub">${parts.map((k) => `${PART[k][0].toLowerCase()} ${money(p[k])}`).join(" + ")}</span>`}` : null;
    const rows = [
      sel ? row("unitcost", "Cost per unit", costV, { prompt: "Pick an option first" }) : row("cost", "Cost per unit", costV, { prompt: "Add what it costs you · labor, materials or subcontracted", editor: () => costEditor(x) }),
      row("margin", "Margin", `${pct(x.margin ?? 0)}<span class="detail-value-sub">${comfy() ? addsWords(x.margin ?? 0) : `${markup(x.margin ?? 0)} markup`}</span>`, { editor: () => marginEditor(x) }),
      row("unitprice", "Price per unit", uc ? `${money(priceOf(uc, x.margin ?? 0))} / ${esc(x.unit)}` : null, { editor: uc ? () => unitPriceEditor(x) : null }),
      row("total", "Total", included(x) || t.cost ? `${money(t.price)}<span class="detail-value-sub">${money(t.cost)} cost, ${money(t.price - t.cost)} profit${x.buy && T.get(x.id)?.buy ? ` · rounded up to whole ${esc(x.buy.by)}s` : ""}</span>` : null),
    ];
    const hidden = [
      row("minspend", "Minimum spend", x.minSpend ? money(x.minSpend) : null, { editor: () => `<form data-editor="minspend" novalidate>${field("ed-minspend", "Minimum spend", moneyInput("ed-minspend", x.minSpend, { name: "minspend" }), { hint: "The line never prices below this" })}${editorFoot()}</form>` }),
      row("taxrate", "Tax", x.taxRate != null ? `${pct(x.taxRate)} on this line` : null, { prompt: "The job's rate", editor: () => `<form data-editor="taxrate" novalidate>${field("ed-taxrate", "Tax on this line", pctInput("ed-taxrate", x.taxRate ?? M.job.tax), { hint: "Only when it differs from the job's rate" })}${editorFoot()}</form>` }),
      row("budget", "Budget code", x.budget ? esc(x.budget) : null, { editor: () => textEditor("budget", "Budget code", x.budget) }),
    ];
    return section("price", "Pricing", rows, hidden.filter((r, i) => !([x.minSpend, x.taxRate, x.budget][i] != null && rows.push(r))));
  }
  function costEditor(x) {
    const p = partsOf(x);
    const part = (k) => `<div class="est-part-row"${p[k] == null ? "" : " data-on"}><label class="est-part-switch"><input type="checkbox" class="toggle" name="on-${k}"${p[k] != null ? " checked" : ""} data-part-toggle="${k}"><span>${ic(PART[k][1], 14, { optical: true })}${PART[k][0]}</span></label>${moneyInput(`ed-${k}`, p[k], { name: k, disabled: p[k] == null, label: `${PART[k][0]} cost per ${x.unit}` })}</div>`;
    return `<form data-editor="cost" novalidate><p class="detail-row-note">Per ${esc(x.unit)}. Any line can have all three.</p>${["l", "m", "s"].map(part).join("")}<p class="est-cost-sum" aria-live="polite">${money(unitCost(x))} per ${esc(x.unit)}</p>${editorFoot()}</form>`;
  }
  const marginEditor = (x) => `<form data-editor="margin" novalidate>${field("ed-margin", "Margin", pctInput("ed-margin", x.margin ?? 0), { hint: "Of the price. 30% is the company's default." })}<p class="detail-row-note" id="ed-margin-out" aria-live="polite">${markup(x.margin ?? 0)} markup · ${money(priceOf(unitCost(x), x.margin ?? 0))} per ${esc(x.unit)}</p>${editorFoot()}</form>`;
  const unitPriceEditor = (x) => `<form data-editor="unitprice" novalidate>${field("ed-unitprice", "Price per unit", moneyInput("ed-unitprice", priceOf(unitCost(x), x.margin ?? 0), { name: "unitprice" }), { hint: "Setting the price works out the margin from the cost" })}${editorFoot()}</form>`;
  const textEditor = (key, label, v, o = {}) => `<form data-editor="${key}" novalidate>${field(`ed-${key}`, label, o.area ? `<textarea class="input" data-size="sm" id="ed-${key}" name="${key}" rows="3">${esc(v || "")}</textarea>` : `<input class="input" data-size="sm" id="ed-${key}" name="${key}" value="${esc(v || "")}">`, { hint: o.hint })}${editorFoot()}</form>`;
  const yesNo = (key, label, v, yes, no) => `<form data-editor="${key}" novalidate><fieldset class="est-choice"><legend class="field-label">${label}</legend><label class="choice"><input type="radio" class="radio" name="${key}" value="1"${v ? " checked" : ""}><span>${yes}</span></label><label class="choice"><input type="radio" class="radio" name="${key}" value="0"${v ? "" : " checked"}><span>${no}</span></label></fieldset>${editorFoot()}</form>`;

  function customerSection(x, sel) {
    const optional = x.optional ? (x.included ? "Yes · in the price unless Marco takes it out" : "Yes · left out unless Marco adds it") : null;
    const rows = [
      row("desc", "Description", x.desc ? esc(x.desc) : null, { prompt: "Add what Marco reads on the proposal", wide: true, editor: () => textEditor("desc", "Description", x.desc, { area: true, hint: "Marco reads this on the proposal" }) }),
    ];
    const hidden = [
      row("optional", "Optional", optional, { editor: () => `<form data-editor="optional" novalidate><fieldset class="est-choice"><legend class="field-label">Optional</legend>${[["no", "No, it's part of the job"], ["out", "Yes, left out unless Marco adds it"], ["in", "Yes, in the price unless Marco takes it out"]].map(([v, l]) => `<label class="choice"><input type="radio" class="radio" name="optional" value="${v}"${(x.optional ? (x.included ? "in" : "out") : "no") === v ? " checked" : ""}><span>${l}</span></label>`).join("")}</fieldset>${editorFoot()}</form>` }),
    ];
    if (x.optional) rows.push(hidden.pop());
    if (sel) {
      rows.push(row("chooser", "Who chooses", x.chooser === "customer" ? "Marco, on the proposal" : "You · hidden from the proposal", { editor: () => `<form data-editor="chooser" novalidate><fieldset class="est-choice"><legend class="field-label">Who chooses</legend><label class="choice"><input type="radio" class="radio" name="chooser" value="customer"${x.chooser === "customer" ? " checked" : ""}><span>Marco, on the proposal<span class="choice-hint">He starts from the current option</span></span></label><label class="choice"><input type="radio" class="radio" name="chooser" value="you"${x.chooser === "you" ? " checked" : ""}><span>You<span class="choice-hint">Hidden from the proposal; nothing's priced until you pick</span></span></label></fieldset>${editorFoot()}</form>` }));
      if (x.chooser === "customer") rows.push(row("lock", "Marco can change it", x.lock ? "No · he sees your pick, locked" : "Yes", { editor: () => yesNo("lock", "Marco can change it", !x.lock, "Yes", "No, he sees it locked") }));
    } else if (x.kind === "item") hidden.push(`<div class="detail-row" data-row="upgrade">${rlabel("upgrade", "Options")}<button type="button" class="link-button detail-row-link" data-to-selection>${ic("palette", 14)}Offer Marco options for this line</button></div>`);
    return section("cust", "For the customer", rows, hidden);
  }
  function productionSection(x) {
    const p = person(x.assignee);
    const rows = [
      row("stage", "Stage", x.stage ? esc(x.stage) : null, { editor: () => `<form data-editor="stage" novalidate>${field("ed-stage", "Stage", select("ed-stage", E.STAGES.map((s) => [s, s]), x.stage, { name: "stage" }))}${editorFoot()}</form>` }),
      row("assignee", "Assigned to", p ? `<span class="cell-person"><span class="avatar" data-size="sm" data-color="${p.color}" aria-hidden="true">${p.initials}</span>${esc(p.name)}</span>` : null, { prompt: "Nobody yet", editor: () => `<form data-editor="assignee" novalidate>${field("ed-assignee", "Assigned to", select("ed-assignee", [["", "Nobody yet"], ...E.TEAM.map((t) => [t.id, t.name])], x.assignee, { name: "assignee" }))}${editorFoot()}</form>` }),
    ];
    const hidden = [
      row("vendor", "Vendor", x.vendor ? esc(x.vendor) : null, { editor: () => textEditor("vendor", "Vendor", x.vendor) }),
      row("duration", "Duration", x.duration ? plural(x.duration, "day") : null, { editor: () => `<form data-editor="duration" novalidate>${field("ed-duration", "Duration", `<span class="input-group" data-size="sm"><input class="input" data-size="sm" id="ed-duration" name="duration" inputmode="decimal" value="${x.duration ?? ""}"><span class="input-adornment">days</span></span>`, { hint: "Used when it's put on the schedule" })}${editorFoot()}</form>` }),
      row("notes", "Notes for the team", x.notes ? esc(x.notes) : null, { wide: true, editor: () => textEditor("notes", "Notes for the team", x.notes, { area: true, hint: "Only your team sees these" }) }),
    ];
    return section("prod", "Production", rows, hidden.filter((r, i) => !([x.vendor, x.duration, x.notes][i] && rows.push(r))));
  }
  function catalogSection(x) {
    const rows = [
      x.autocost ? `<div class="detail-row" data-row="autocost">${rlabel("price", "Price")}<div class="detail-value" data-static>Kept up to date<span class="detail-value-sub">AutoCost, Home Depot Austin · checked Oct 28</span></div></div>` : "",
      x.sku ? row("sku", "SKU", esc(x.sku), { editor: () => textEditor("sku", "SKU", x.sku) }) : "",
    ];
    const hidden = [x.sku ? "" : row("sku", "SKU", null, { editor: () => textEditor("sku", "SKU", x.sku) })];
    return section("cat", "Catalog", [...rows, `<div class="detail-row">${rlabel("catalog", "In the catalog")}<button type="button" class="link-button detail-row-link" data-save-catalog>${ic("file-plus", 14)}Save it to the catalog</button></div>`], hidden);
  }

  function optionsSection(x) {
    const cur = optionOf(x), q = qtyOf(x).value ?? 0;
    const priceFor = (o) => priceOf((o.c.m ?? 0) + (o.c.l ?? 0) + (o.c.s ?? 0), x.margin ?? 0);
    const curTotal = cur ? priceFor(cur) * q : 0;
    const traits = x.traits ? `<div class="est-traits">${x.traits.map(([name, vals], ti) => `<fieldset class="est-trait"><legend>${esc(name)}</legend><div class="segmented" data-size="sm">${vals.map((v) => `<label class="segmented-option"><input type="radio" name="trait-${ti}" value="${esc(v)}" data-trait="${ti}"${cur?.t?.[ti] === v ? " checked" : ""}> ${esc(v)}</label>`).join("")}</div></fieldset>`).join("")}<p class="detail-row-note">${plural(x.options.length, "combination")}; pick a style and a finish, or one below.</p></div>` : "";
    const opts = x.options.map((o, i) => {
      const isCur = x.current === i, d = (priceFor(o) * q) - curTotal;
      const delta = cur && !isCur && q ? `<span class="est-delta" data-sign="${d > 0 ? "up" : d < 0 ? "down" : "same"}">${d === 0 ? "same price" : `${d > 0 ? "+" : "−"}${money(Math.abs(d), { whole: true })}`}</span>` : "";
      return `<label class="est-opt"${isCur ? " data-current" : ""}><input type="radio" class="radio" name="opt" value="${i}" data-pick-option="${i}"${isCur ? " checked" : ""}><span class="est-opt-text"><span class="est-opt-name">${esc(o.name)}${isCur ? `<span class="badge" data-size="sm">${x.chooser === "customer" ? "Current" : "Picked"}</span>` : ""}</span><span class="est-opt-meta">${money(priceFor(o))} / ${esc(x.unit)}${o.note ? ` · ${esc(o.note)}` : ""}</span></span>${delta}</label>`;
    }).join("");
    const adding = ui.edit === "addopt";
    const add = adding ? `<form class="detail-editor" data-editor="addopt" novalidate>${field("ed-optname", "Option", `<input class="input" data-size="sm" id="ed-optname" name="name" placeholder="Brand, line and colour" required>`)}<div class="est-form-row">${field("ed-optcost", `Cost per ${esc(x.unit)}`, moneyInput("ed-optcost", null, { name: "cost" }))}${field("ed-optpart", "It's", select("ed-optpart", [["m", "Materials"], ["l", "Labor"], ["s", "Subcontracted"]], partsOf(x).s != null ? "s" : "m", { name: "part" }))}</div>${editorFoot({ save: "Add option" })}</form>` : `<button type="button" class="link-button est-more" data-add-option data-focus-key="addopt">${ic("plus", 14)}Add an option</button>`;
    const legend = x.chooser === "customer" ? `What Marco can pick from, starting at the current one. Differences are for this line's ${num(q)} ${esc(x.unit)}.` : x.current == null ? "Pick one: the line prices at nothing until you do." : `What you picked. Marco doesn't see this choice.`;
    return `<section class="detail-section" aria-labelledby="sec-options" data-row="options"><h3 class="detail-section-title" id="sec-options">Options</h3>${traits}<fieldset class="est-opts"><legend class="detail-row-note">${legend}</legend>${opts}</fieldset>${add}</section>`;
  }

  function assemblyHtml(x, t) {
    const lines = descendants(x).filter(isLeaf), left = lines.filter((l) => needsOf(l).some((n) => n !== "customer"));
    const scope = x.key ? M.dims.filter((d) => d.scope === x.key) : [];
    const facts = [["Lines", lines.length], ["Cost", money(t.cost)], ["Margin", marginRange(x)], ["Price", included(x) ? money(t.price) : `<span class="est-muted">Not included</span>`, "strong"]];
    const need = left.length ? { icon: "list-tree", text: `<b>${plural(left.length, "line")} in it still ${left.length === 1 ? "needs" : "need"} something:</b> ${left.slice(0, 3).map((l) => `<button type="button" class="link-button" data-open-line="${l.id}">${esc(l.name)}</button>`).join(", ")}${left.length > 3 ? ` and ${left.length - 3} more` : ""}.` } : null;
    let h = headHtml(x, `Assembly${x.category ? ` · ${esc(x.category)}` : ""}`, facts, need);
    const c = t.cost || 1;
    h += `<section class="detail-section" aria-labelledby="sec-in"><h3 class="detail-section-title" id="sec-in">What's in it</h3>
      <span class="est-bar" data-size="lg" aria-hidden="true">${["l", "m", "s"].map((k) => `<span data-part="${k}" style="--w:${(t[k] / c) * 100}%"></span>`).join("")}</span>
      <dl class="est-split-list">${["l", "m", "s"].map((k) => `<div data-part="${k}"><dt>${ic(PART[k][1], 12)}${PART[k][0]}</dt><dd>${money(t[k])}</dd></div>`).join("")}<div><dt>Profit</dt><dd>${money(t.price - t.cost)}</dd></div></dl>
      <ul class="est-children">${x.children.map((ch) => `<li><button type="button" class="link-button" data-open-line="${ch.id}">${esc(ch.name)}</button><span class="est-muted">${included(ch) ? money(T.get(ch.id)?.price) : "Not included"}</span></li>`).join("")}</ul></section>`;
    h += section("qty", "Quantity", [
      row("aqty", "Quantity", `${num(x.qty ?? 1)} ${esc(x.unit)}<span class="detail-value-sub">everything in it is multiplied by this</span>`, { editor: () => `<form data-editor="aqty" novalidate>${field("ed-aqty", `Quantity, in ${esc(x.unit)}`, `<input class="input" data-size="sm" id="ed-aqty" name="qty" inputmode="decimal" value="${x.qty ?? 1}">`, { hint: "Two identical bathrooms: 2", width: 10 })}${editorFoot()}</form>` }),
    ]);
    h += section("price", "Pricing", [
      row("amargin", "Margin", marginRange(x), { note: marginRange(x).includes("–") ? "Its lines have different margins." : "", editor: () => `<form data-editor="amargin" novalidate>${field("ed-amargin", "One margin for everything in it", pctInput("ed-amargin", Math.max(...lines.filter((l) => l.kind !== "fee").map((l) => l.margin ?? 0), 0)), { hint: `Sets ${plural(lines.filter((l) => l.kind !== "fee").length, "line")} to the same margin; now ${marginRange(x)}` })}${editorFoot({ save: "Set for all" })}</form>` }),
      row("total", "Total", `${money(t.price)}<span class="detail-value-sub">${money(t.cost)} cost, ${money(t.price - t.cost)} profit</span>`),
    ]);
    if (scope.length) h += `<section class="detail-section" aria-labelledby="sec-dims"><h3 class="detail-section-title" id="sec-dims">Measurements here</h3>${scope.map(dimRow).join("")}<button type="button" class="link-button est-more" data-open-dims>${ic("ruler-combined", 14)}All the job's measurements</button></section>`;
    h += customerSection(x, false);
    h += section("prod", "Production", [row("category", "Category", x.category ? esc(x.category) : null, { editor: () => textEditor("category", "Category", x.category) })], [row("notes", "Notes for the team", x.notes ? esc(x.notes) : null, { wide: true, editor: () => textEditor("notes", "Notes for the team", x.notes, { area: true, hint: "Only your team sees these" }) })].filter(() => !x.notes).concat([]));
    if (x.notes) h = h.replace(/<\/section>$/, `${row("notes", "Notes for the team", esc(x.notes), { wide: true, editor: () => textEditor("notes", "Notes for the team", x.notes, { area: true, hint: "Only your team sees these" }) })}</section>`);
    return h + tailHtml();
  }

  function feeHtml(x, t) {
    const base = { cost: "cost", price: "price", labor: "labor cost" }[x.base] || "cost";
    const facts = [["Rate", `${num(x.rate)}%`], ["Cost", money(t.cost)], ["Margin", pct(x.margin ?? 0)], ["Price", money(t.price), "strong"]];
    let h = headHtml(x, "Fee · a share of the project", facts, null);
    h += section("fee", "The fee", [
      row("base", "Based on", `The project's ${base}<span class="detail-value-sub">${money(t.base)} without fees</span>`, { editor: () => `<form data-editor="base" novalidate>${field("ed-base", "Based on", select("ed-base", [["cost", "The project's cost"], ["price", "The project's price"], ["labor", "The project's labor cost"]], x.base, { name: "base" }))}${editorFoot()}</form>` }),
      row("rate", "Rate", `${num(x.rate)}%<span class="detail-value-sub">${money(t.cost)} today; it follows the project as it changes</span>`, { editor: () => `<form data-editor="rate" novalidate>${field("ed-rate", "Rate", `<span class="input-group" data-size="sm"><input class="input" data-size="sm" id="ed-rate" name="rate" inputmode="decimal" value="${x.rate}"><span class="input-adornment">%</span></span>`, { width: 8 })}${editorFoot()}</form>` }),
    ]);
    h += section("price", "Pricing", [row("margin", "Margin", `${pct(x.margin ?? 0)}<span class="detail-value-sub">${x.margin ? markup(x.margin) + " markup" : "passed on at cost"}</span>`, { editor: () => marginEditor(x) }), row("total", "Total", money(t.price))]);
    h += customerSection(x, false);
    h += productionSection(x);
    return h + tailHtml();
  }

  // the job's measurements, in the record's place (Measurements in the job's navigation, or the button)
  function dimRow(d) {
    const used = order.filter((x) => x.formula && E.usesOf(x.formula).includes(d.code));
    const key = `dim-${d.code}`;
    return row(key, `${esc(d.name)} <code class="est-code">${d.code}</code>`, d.value != null ? `${num(d.value)} ${esc(d.unit)}<span class="detail-value-sub">used in ${plural(used.length, "line")}${d.how ? ` · ${esc(d.how)}` : ""}</span>` : null, {
      prompt: `Take it · needed for ${used.map((u) => esc(u.name)).join(", ") || "nothing yet"}`,
      aria: `${d.name}: ${d.value == null ? "not taken" : `${num(d.value)} ${d.unit}`}. Edit`,
      editor: () => `<form data-editor="${key}" novalidate>${field(`ed-${key}`, `${esc(d.name)}, in ${esc(d.unit)}`, `<input class="input" data-size="sm" id="ed-${key}" name="value" inputmode="decimal" value="${d.value ?? ""}" aria-describedby="ed-${key}-error">`, { width: 12, hint: used.length ? `Changes ${plural(used.length, "line")}: ${used.map((u) => esc(u.name)).join(", ")}` : "" })}<p class="field-error" id="ed-${key}-error" hidden></p>${editorFoot()}</form>`,
    });
  }
  function dimsHtml() {
    const groups = [["roof", "Roof replacement"], ["kitchen", "Kitchen remodel"]];
    const open = M.dims.filter((d) => d.value == null);
    return `<header class="detail-head"><h2 id="detail-title" tabindex="-1">Measurements</h2><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-close-record aria-label="Close" data-tip="Close">${ic("xmark", 16)}</button></header>
      <div class="detail-scroll"><div class="detail-section detail-hero est-hero"><p class="est-hero-kind"><span class="est-kind" data-kind="dims" aria-hidden="true">${ic("ruler-combined", 14, { optical: true })}</span><span>The job's measurements · ${plural(M.dims.length, "measurement")}</span></p>
        <p class="detail-row-note">Quantities are worked out from these: change one and every line that uses it follows.</p>
        ${open.length ? `<div class="est-need" role="note">${ic("ruler-combined", 14)}<p><b>${plural(open.length, "measurement")} to take:</b> ${open.map((d) => esc(d.name.toLowerCase())).join(", ")}.</p></div>` : ""}</div>
        ${groups.map(([k, l]) => `<section class="detail-section" aria-labelledby="sec-d-${k}"><h3 class="detail-section-title" id="sec-d-${k}">${l}</h3>${M.dims.filter((d) => d.scope === k).map(dimRow).join("")}</section>`).join("")}</div>`;
  }

  // ---------- committing an editor ----------
  const numVal = (v) => { if (v == null) return NaN; const s = String(v).replace(/[$,%\s]/g, ""); return s === "" ? NaN : Number(s); };
  // leaving a field without saving: a value opened from its chip goes back to being a chip
  function stopEditing() {
    const k = ui.edit; ui.edit = null;
    const back = ui.revealing === k; if (back) { ui.revealed.delete(k); ui.revealing = null; }
    renderRecord(); $(`[data-focus-key="${back ? "reveal" : "v"}-${k}"]`, host())?.focus();
  }
  function commit(form) {
    ui.revealing = null;
    const key = form.dataset.editor, fd = new FormData(form), x = byId.get(ui.open);
    const err = (id, msg) => { const e = $(`#${id}`, form); if (e) { e.hidden = false; e.innerHTML = `${ic("triangle-exclamation", 12)}${msg}`; } const inp = $(`[aria-describedby~="${id}"]`, form); inp?.setAttribute("aria-invalid", "true"); inp?.focus(); return false; };
    const done = (label, fn) => { ui.edit = null; change(label, fn); $(`[data-focus-key="v-${key}"]`, host())?.focus({ preventScroll: true }); return true; };
    if (key.startsWith("dim-")) {
      const d = dimByCode(key.slice(4)), v = numVal(fd.get("value"));
      if (fd.get("value") === "" ) return done(`${d.name} cleared`, () => (d.value = null));
      if (!(v >= 0)) return err(`ed-${key}-error`, "Type a number, like 1,850");
      return done(`${d.name}: ${d.value == null ? "taken" : `${num(d.value)} → ${num(v)}`} ${d.unit}`, () => (d.value = v));
    }
    switch (key) {
      case "name": { const v = String(fd.get("name")).trim(); if (!v) return err("ed-name", "Give it a name"); return done(`Renamed to ${v}`, () => (x.name = v)); }
      case "qty": {
        if (fd.get("how") === "formula") {
          const f = String(fd.get("formula")).trim(), r = E.evalFormula(f, M.dims);
          if (!f || r.error) { $("#ed-formula-out", form).innerHTML = formulaOut(f, x.unit); $("#ed-formula", form).setAttribute("aria-invalid", "true"); $("#ed-formula", form).focus(); return false; }
          return done(`${x.name}: quantity from ${f}`, () => { x.formula = f; delete x.qty; });
        }
        const raw = fd.get("qty"), v = numVal(raw);
        if (raw === "") return done(`${x.name}: quantity cleared`, () => { x.qty = null; delete x.formula; });
        if (!(v >= 0)) return err("ed-qty-error", "Type a number, like 12 or 2.5");
        return done(`${x.name}: quantity ${num(v)} ${x.unit}`, () => { x.qty = v; delete x.formula; });
      }
      case "unit": return done(`${x.name}: unit ${fd.get("unit")}`, () => (x.unit = fd.get("unit")));
      case "cost": {
        const c = {};
        for (const k of ["l", "m", "s"]) { if (fd.get(`on-${k}`)) { const v = numVal(fd.get(k)); c[k] = Number.isFinite(v) ? v : 0; } else c[k] = null; }
        return done(`${x.name}: cost ${money(c.m + c.l + c.s)} per ${x.unit}`, () => (x.c = c));
      }
      case "margin": case "amargin": {
        const v = numVal(fd.get(key === "margin" ? "ed-margin" : "ed-amargin"));
        if (!(v >= 0 && v < 100)) return err(key === "margin" ? "ed-margin" : "ed-amargin", "Between 0 and 99%");
        if (key === "amargin") return done(`${x.name}: every line at ${v}% margin`, () => descendants(x).filter((d) => isLeaf(d) && d.kind !== "fee").forEach((d) => (d.margin = v / 100)));
        return done(`${x.name}: margin ${pct(x.margin ?? 0)} → ${v}%`, () => (x.margin = v / 100));
      }
      case "unitprice": {
        const v = numVal(fd.get("unitprice")), c = unitCost(x);
        if (!(v > 0)) return err("ed-unitprice", "Type a price");
        if (v < c) return err("ed-unitprice", `That's under the cost (${money(c)}): it would sell at a loss`);
        return done(`${x.name}: price ${money(v)} per ${x.unit}`, () => (x.margin = Math.round((1 - c / v) * 1000) / 1000));
      }
      case "buy": {
        const size = numVal(fd.get("size")), price = numVal(fd.get("price")), waste = numVal(fd.get("waste")) || 0;
        if (!(size > 0)) return err("ed-buy-size", "How many in one, like 10");
        if (!(price >= 0)) return err("ed-buy-price", "What one costs");
        return done(`${x.name}: bought by the ${fd.get("by")}`, () => (x.buy = { by: fd.get("by"), size, price, waste }));
      }
      case "aqty": { const v = numVal(fd.get("qty")); if (!(v > 0)) return err("ed-aqty", "At least 1"); return done(`${x.name}: ×${num(v)}`, () => (x.qty = v)); }
      case "rate": { const v = numVal(fd.get("rate")); if (!(v >= 0)) return err("ed-rate", "A percentage, like 6"); return done(`${x.name}: ${num(v)}%`, () => (x.rate = v)); }
      case "base": return done(`${x.name}: based on the project's ${fd.get("base")}`, () => (x.base = fd.get("base")));
      case "stage": return done(`${x.name}: stage ${fd.get("stage")}`, () => (x.stage = fd.get("stage")));
      case "assignee": return done(`${x.name}: assigned to ${person(fd.get("assignee"))?.name || "nobody"}`, () => (x.assignee = fd.get("assignee") || null));
      case "optional": { const v = fd.get("optional"); return done(`${x.name}: ${v === "no" ? "part of the job" : v === "in" ? "optional, included" : "optional, left out"}`, () => { x.optional = v !== "no"; x.included = v === "in"; }); }
      case "custqty": return done(`${x.name}: customer ${fd.get("custqty") === "1" ? "can" : "can't"} change the quantity`, () => (x.custQty = fd.get("custqty") === "1"));
      case "chooser": return done(`${x.name}: ${fd.get("chooser") === "you" ? "your choice" : "Marco's choice"}`, () => { x.chooser = fd.get("chooser"); if (x.chooser === "you") x.lock = false; });
      case "lock": return done(`${x.name}: ${fd.get("lock") === "1" ? "Marco can change it" : "locked for Marco"}`, () => (x.lock = fd.get("lock") !== "1"));
      case "duration": { const v = numVal(fd.get("duration")); return done(`${x.name}: takes ${num(v)} days`, () => (x.duration = Number.isFinite(v) ? v : null)); }
      case "minspend": { const v = numVal(fd.get("minspend")); return done(`${x.name}: minimum ${money(v)}`, () => (x.minSpend = Number.isFinite(v) ? v : null)); }
      case "taxrate": { const v = numVal(fd.get("ed-taxrate")); return done(`${x.name}: tax ${num(v)}%`, () => (x.taxRate = Number.isFinite(v) ? v / 100 : null)); }
      case "addopt": {
        const nm = String(fd.get("name")).trim(), cst = numVal(fd.get("cost"));
        if (!nm) return err("ed-optname", "Name the option");
        const c = { m: null, l: null, s: null }; c[fd.get("part")] = Number.isFinite(cst) ? cst : 0;
        ui.edit = null;
        change(`${x.name}: option ${nm} added`, () => x.options.push({ name: nm, c }));
        return true;
      }
      default: { // text values: desc, notes, vendor, sku, budget, category
        const v = String(fd.get(key) ?? "").trim();
        return done(`${x.name}: ${key === "desc" ? "description" : key} ${v ? "changed" : "cleared"}`, () => (x[key] = v || null));
      }
    }
  }

  // ---------- adding lines ----------
  let addText = "";
  const CATALOG = [
    { name: "Ice and water shield, 2 sq roll", kind: "item", unit: "roll", c: { m: 118, l: null, s: null }, autocost: true },
    { name: "Plywood decking, 7/16 OSB", kind: "item", unit: "sheet", c: { m: 18.4, l: null, s: null }, autocost: true },
    { name: "Drywall patch and repair", kind: "item", unit: "hr", c: { m: null, l: 52, s: null } },
    { name: "Dishwasher install", kind: "item", unit: "each", c: { m: null, l: 180, s: null } },
    { name: "Recessed lights, 4 in LED", kind: "item", unit: "each", c: { m: 24, l: 65, s: null }, autocost: true },
    { name: "Gutters, 5 in seamless", kind: "item", unit: "ft", c: { m: null, l: null, s: 9.5 } },
    { name: "Bathroom fan, 80 CFM", kind: "item", unit: "each", c: { m: 129, l: 150, s: null }, autocost: true },
    { name: "Flooring", kind: "selection", unit: "sq ft", options: [{ name: "LVP, 7 in plank, Oak", c: { m: 3.8, l: 2.4, s: null } }, { name: "Porcelain tile, 12×24", c: { m: 5.2, l: 6.5, s: null } }] },
  ];
  function addSuggest(inp) {
    addText = inp.value;
    const q = inp.value.trim().toLowerCase();
    const hits = q ? CATALOG.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5) : CATALOG.slice(0, 3);
    const where = ui.adding === "root" ? null : byId.get(ui.adding);
    const html = `<div class="pop-body est-add-pop">${q ? mi(`data-create="item" id="add-opt-0"`, `Create “${esc(inp.value.trim())}”`, "box", { hint: "↵" }) : ""}
      ${hits.length ? `<p class="pop-section">${q ? "From the catalog" : "Recently used"}</p>${hits.map((c, i) => mi(`data-catalog="${CATALOG.indexOf(c)}"`, esc(c.name), c.kind === "selection" ? "palette" : "box", { hint: c.kind === "selection" ? "Selection" : c.autocost ? "AutoCost" : "Item" })).join("")}` : ""}
      <hr><p class="pop-section">More</p>${mi(`data-create="assembly"`, q ? `Assembly “${esc(inp.value.trim())}”` : "Assembly", "layers")}${mi(`data-create="selection"`, q ? `Selection “${esc(inp.value.trim())}”` : "Selection", "palette")}${mi(`data-create="fee"`, "Fee, a share of the project", "percent")}</div>`;
    if (popFor?.kind === "add" && pop.matches(":popover-open")) { pop.innerHTML = html; place(); }
    else openPop("add", inp, html, { role: "listbox", label: `Add to ${where ? where.name : "the estimate"}`, focus: false });
    inp.setAttribute("aria-expanded", "true");
  }
  function addLine(kind, from) {
    const name = addText.trim(), where = ui.adding === "root" ? null : byId.get(ui.adding);
    const list = where ? where.children : M.tree;
    const nid = `n${++M.seq}`;
    let line;
    if (from) line = { id: nid, ...clone(from), kind: from.kind, qty: null, margin: 0.3, stage: "Install", ...(from.kind === "selection" ? { chooser: "customer", current: 0 } : {}) };
    else if (kind === "assembly") line = { id: nid, kind: "assembly", name: name || "New assembly", qty: 1, unit: "each", children: [] };
    else if (kind === "selection") line = { id: nid, kind: "selection", name: name || "New selection", chooser: "customer", current: null, qty: null, unit: "each", margin: 0.3, stage: "Install", options: [] };
    else if (kind === "fee") line = { id: nid, kind: "fee", name: name || "Fee", base: "cost", rate: 5, margin: 0, unit: "each", stage: "General" };
    else { if (!name) return; line = { id: nid, kind: "item", name, qty: null, unit: "each", c: { m: null, l: null, s: null }, margin: 0.3, stage: "Install" }; }
    change(`Added ${line.name}${where ? ` to ${where.name}` : ""}`, () => list.push(line));
    addText = "";
    if (kind === "item" && !from) { // type, Enter, type, Enter: the field stays for the next one
      render(); const inp = $("#add-input"); inp?.focus(); closePop();
      $("#add-input")?.closest("tr")?.previousElementSibling?.scrollIntoView({ block: "nearest" });
      return;
    }
    ui.adding = null; closePop(); render();
    openRecord(nid, { edit: from ? "qty" : line.kind === "selection" ? "addopt" : line.kind === "assembly" ? null : null, focus: from || line.kind === "selection" ? null : "title" });
  }

  // ---------- bulk ----------
  const chosen = () => [...ui.selected].map((id) => byId.get(id)).filter(Boolean);
  const chosenLeaves = () => [...new Set(chosen().flatMap((x) => (isLeaf(x) ? [x] : descendants(x).filter(isLeaf))))];
  function bulkBar() {
    const bar = $("#bulk-bar"), xs = chosen();
    if (!xs.length) { bar.hidden = true; return; }
    const leaves = chosenLeaves(), top = xs.filter((x) => !xs.some((y) => y !== x && pathOf(x).includes(y)));
    const sameParent = top.length > 1 && top.every((x) => parentOf.get(x.id) === parentOf.get(top[0].id));
    const priced = leaves.filter((x) => x.kind !== "fee");
    const act = (attr, label, icon, o = {}) => `<button type="button" class="button" data-variant="ghost" data-size="sm" ${attr}${o.menu ? ' aria-haspopup="menu" aria-expanded="false"' : ""}${o.tone ? ` data-tone="${o.tone}"` : ""}>${ic(icon, 16)}<span class="floating-bar-label">${label}</span>${o.menu ? `<span class="floating-bar-chev">${ic("chevron-down", 12)}</span>` : ""}</button>`;
    const n = top.length;
    bar.hidden = false;
    bar.setAttribute("aria-label", `Bulk actions for ${n} selected`);
    bar.innerHTML = `<button type="button" class="floating-bar-count" data-clear-selection aria-label="Clear selection (${n} selected)">${ic("xmark", 14)}<span aria-live="polite">${n} selected</span></button>
      ${ui.selected.size < order.length ? `<button type="button" class="floating-bar-link" data-select-every>Select all ${order.filter(isLeaf).length}</button>` : ""}<span class="floating-bar-sep" aria-hidden="true"></span>
      <span class="floating-bar-actions">${priced.length ? act("data-bulk=margin", "Margin", "percent", { menu: true }) : ""}${leaves.length ? act("data-bulk=stage", "Stage", "status", { menu: true }) + act("data-bulk=assign", "Assign", "user", { menu: true }) : ""}${leaves.some((x) => !x.optional) ? act("data-bulk=optional", "Make optional", "eye") : ""}${leaves.some((x) => x.optional && !x.included) ? act("data-bulk=include", "Include", "circle-plus") : ""}${act("data-bulk=move", "Move", "folder", { menu: true })}${act("data-bulk=more", "More", "ellipsis", { menu: true })}</span>
      <span class="floating-bar-sep" aria-hidden="true"></span>${act("data-bulk=delete", "Delete", "trash", { tone: "danger" })}`;
    bar.dataset.combine = sameParent ? "1" : "";
  }
  function bulkMenu(kind, from) {
    const leaves = chosenLeaves();
    if (kind === "margin") openPop("bulk", from, `<form class="pop-body est-pop-form" data-bulk-form="margin" novalidate>${field("bulk-margin", `Margin for ${plural(leaves.filter((l) => l.kind !== "fee").length, "line")}`, pctInput("bulk-margin", 0.3))}<button type="submit" class="button" data-size="sm">Set margin</button></form>`, { role: "dialog", label: "Set the margin" });
    if (kind === "stage") openPop("bulk", from, `<div class="pop-body">${E.STAGES.map((s) => mi(`data-bulk-stage="${s}"`, s)).join("")}</div>`, { label: "Set the stage" });
    if (kind === "assign") openPop("bulk", from, `<div class="pop-body">${E.TEAM.map((t) => mi(`data-bulk-assign="${t.id}"`, t.name, "user")).join("")}${mi(`data-bulk-assign=""`, "Nobody yet")}</div>`, { label: "Assign to" });
    if (kind === "move") openPop("bulk", from, `<div class="pop-body">${mi(`data-bulk-move="root"`, "The estimate's top level", "list-tree")}${order.filter((a) => a.kind === "assembly" && !chosen().some((c) => c === a || pathOf(a).includes(c))).map((a) => mi(`data-bulk-move="${a.id}"`, `${"  ".repeat(a.level)}${esc(a.name)}`, "layers")).join("")}</div>`, { label: "Move to" });
    if (kind === "more") openPop("bulk", from, `<div class="pop-body">${$("#bulk-bar").dataset.combine ? mi(`data-bulk-do="combine"`, "Combine as an assembly", "layers") : ""}${mi(`data-bulk-do="duplicate"`, "Duplicate", "copy")}${mi(`data-bulk-do="catalog"`, "Save to the catalog", "file-plus")}</div>`, { label: "More actions" });
  }
  const topChosen = () => { const xs = chosen(); return xs.filter((x) => !xs.some((y) => y !== x && pathOf(x).includes(y))); };
  function remove(xs) { xs.forEach((x) => { const l = listOf(x); l.splice(l.indexOf(x), 1); }); }
  const reId = (x) => { const y = clone(x); const walk = (n) => { n.id = `n${++M.seq}`; n.children?.forEach(walk); }; walk(y); return y; };

  // ---------- row and record menus ----------
  function rowMenu(x, from) {
    openPop("row", from, `<div class="pop-body">${mi(`data-row-do="open" data-line="${x.id}"`, "Open", "sidebar-right")}${x.kind === "assembly" ? mi(`data-row-do="add-in" data-line="${x.id}"`, "Add a line in it", "plus") : ""}${mi(`data-row-do="duplicate" data-line="${x.id}"`, "Duplicate", "copy")}${x.kind === "item" ? mi(`data-row-do="to-selection" data-line="${x.id}"`, "Offer options (turn into a selection)", "palette") : ""}${mi(`data-row-do="move" data-line="${x.id}"`, "Move to…", "folder")}${mi(`data-row-do="catalog" data-line="${x.id}"`, "Save to the catalog", "file-plus")}<hr>${mi(`data-row-do="delete" data-line="${x.id}"`, "Delete", "trash", { tone: "danger" })}</div>`, { label: `Actions for ${x.name}`, end: true });
  }
  function rowDo(what, x, from) {
    closePop();
    if (what === "open") return openRecord(x.id);
    if (what === "add-in") { ui.folded.delete(x.id); ui.adding = x.id; addText = ""; render(); return; }
    if (what === "duplicate") { const y = reId(x); y.name = `${x.name} (copy)`; change(`Duplicated ${x.name}`, () => { const l = listOf(x); l.splice(l.indexOf(x) + 1, 0, y); }, { toastUndo: true }); return; }
    if (what === "to-selection") return toSelection(x);
    if (what === "catalog") return toast(`${x.name} saved to the catalog (concept: nothing leaves)`);
    if (what === "move") { ui.selected = new Set([x.id]); render(); return bulkMenu("move", $("[data-bulk=move]")); }
    if (what === "delete") return confirmDelete([x]);
  }
  function toSelection(x) {
    change(`${x.name} now offers options`, () => { const o = { name: x.name, c: clone(x.c || { m: null, l: null, s: null }) }; delete x.c; delete x.buy; delete x.autocost; x.kind = "selection"; x.chooser = "customer"; x.current = 0; x.options = [o]; }, { toastUndo: true });
    openRecord(x.id, { edit: "addopt" });
  }
  function confirmDelete(xs) {
    const lines = xs.reduce((n, x) => n + 1 + descendants(x).length, 0);
    const d = $("#confirm");
    $("#confirm-title").textContent = xs.length === 1 ? `Delete ${xs[0].name}?` : `Delete ${plural(xs.length, "line")}?`;
    $("#confirm-text").textContent = lines > xs.length ? `That's ${plural(lines, "line")} with what's in ${xs.length === 1 ? "it" : "them"}. You can undo it right after.` : "You can undo it right after.";
    $("#confirm-go").textContent = xs.length === 1 ? "Delete line" : `Delete ${plural(xs.length, "line")}`;
    $("#confirm-keep").textContent = "Keep";
    d.showModal(); $("#confirm-keep").focus();
    $("#confirm-go").onclick = () => { d.close(); if (xs.some((x) => x.id === ui.open || pathOf(byId.get(ui.open) || {}).includes?.(x))) closeRecord(); xs.forEach((x) => ui.selected.delete(x.id)); change(xs.length === 1 ? `Deleted ${xs[0].name}` : `Deleted ${plural(xs.length, "line")}`, () => remove(xs), { toastUndo: true }); };
  }

  // ---------- Send: the summary before the step ----------
  function openSend() {
    const leaves = order.filter((x) => isLeaf(x) && included(x));
    const fix = leaves.filter((x) => needsOf(x).some((n) => n === "qty" || n === "choose"));
    const check = leaves.filter((x) => needsOf(x).includes("nocost"));
    const cust = leaves.filter((x) => x.kind === "selection" && x.chooser === "customer");
    const optOut = order.filter((x) => x.optional && !x.included);
    const item = (x, why) => `<li><button type="button" class="link-button" data-goto-line="${x.id}">${esc(x.name)}</button><span class="est-muted"> · ${why}</span></li>`;
    const t = T.get("job");
    const body = [];
    if (fix.length) body.push(`<div class="form-summary est-sum" role="alert" tabindex="-1" id="send-fix"><h3>${ic("triangle-exclamation", 16)}${plural(fix.length, "line")} to fix before it goes</h3><p class="text-secondary">These would show on the proposal at $0.</p><ul>${fix.map((x) => item(x, needsOf(x).includes("choose") ? "choose an option" : qtyOf(x).missing ? `take the ${dimByCode(qtyOf(x).missing[0])?.name.toLowerCase()}` : "set the quantity")).join("")}</ul></div>`);
    if (check.length) body.push(`<div class="est-sum" data-tone="check"><h3>${ic("circle-help", 16)}${plural(check.length, "line")} to check</h3><ul>${check.map((x) => item(x, "no cost yet: it shows as free")).join("")}</ul></div>`);
    body.push(`<div class="est-sum" data-tone="info"><h3>${ic("palette", 16)}What Marco decides</h3><ul class="est-plain"><li>${plural(cust.length, "choice")}, each starting from its current option</li>${optOut.length ? `<li>${plural(optOut.length, "optional line")} he can add: ${optOut.map((x) => esc(x.name)).join(", ")}</li>` : ""}</ul></div>`);
    body.push(`<dl class="est-send-facts"><div><dt>To</dt><dd>Marco Ruiz · ${esc(M.job.email)}</dd></div><div><dt>Total with tax</dt><dd><b>${money(t.total)}</b></dd></div></dl>`);
    $("#send-body").innerHTML = body.join("");
    $("#send-foot").innerHTML = fix.length ? `<button type="button" class="button" data-variant="secondary" data-close>Keep editing</button><button type="button" class="button" data-goto-line="${fix[0].id}">Go to the first</button>` : `<button type="button" class="button" data-variant="secondary" data-close>Keep editing</button><button type="button" class="button" data-variant="brand" data-send-now>${ic("send", 14)}${M.sent ? "Resend to Marco" : "Send to Marco"}</button>`;
    $("#send-dialog").showModal();
    ($("#send-fix") || $("[data-send-now]"))?.focus();
  }

  // ---------- loading (D142): opening the estimate waits as Concept controls' Network says ----------
  let net = "0";
  const wire = () => new Promise((res, rej) => (net === "fail" ? setTimeout(() => rej(new Error("offline")), 900) : setTimeout(res, +net)));
  function load() {
    ui.loading = false; ui.failed = false;
    const wrap = $("#est-wrap");
    return BolsterLoading.load(wrap, wire, { label: "the estimate", reserve: true, skeleton: () => skeletonHtml(), render: () => render(), error: () => { ui.failed = true; return `<div class="detail-section"><div class="banner" role="alert"><p>The estimate didn't load. Check your connection and try again.</p><button type="button" class="button" data-variant="secondary" data-size="sm" data-retry>Try again</button></div></div>`; } });
  }

  // ---------- events ----------
  const job = $("#job");
  // opened from the jobs list, closing goes back to it; opened by its link, the list behind it shows
  const fromJobs = new URLSearchParams(location.search).get("from") === "jobs";
  job.addEventListener("click", (e) => {
    const t = e.target;
    const c = (s) => t.closest(s);
    let el;
    if ((el = c("[data-fold]"))) { const id = el.dataset.fold; ui.folded.has(id) ? ui.folded.delete(id) : ui.folded.add(id); render(); $(`[data-fold="${id}"]`)?.focus(); return; }
    if ((el = c("[data-set-qty]"))) { e.preventDefault(); const x = byId.get(el.dataset.setQty), q = qtyOf(x); if (q.missing) { openRecord("dims", { edit: `dim-${q.missing[0]}`, focus: null }); } else openRecord(x.id, { edit: "qty", focus: null }); return; }
    if ((el = c("[data-open-line]"))) { e.preventDefault(); openRecord(el.dataset.openLine); return; }
    if ((el = c(".data-table-select .checkbox"))) {
      if (el.id === "select-all") { ui.selected = el.checked ? new Set(order.map((x) => x.id)) : new Set(); render(); return; }
      const id = el.closest("tr").dataset.id, x = byId.get(id), on = el.checked;
      [x, ...descendants(x)].forEach((d) => (on ? ui.selected.add(d.id) : ui.selected.delete(d.id)));
      if (!on) pathOf(x).forEach((a) => ui.selected.delete(a.id));
      render(); $(`tr[data-id="${id}"] .checkbox`)?.focus(); return;
    }
    if ((el = c("[data-row-menu]"))) { rowMenu(byId.get(el.dataset.rowMenu), el); return; }
    if ((el = c("[data-add]"))) { ui.adding = el.dataset.add; addText = ""; render(); suggestSoon(); return; }
    if ((el = c("tbody tr[data-id]")) && !c("button, a, input, label")) { openRecord(el.dataset.id); return; }
    if ((el = c("[data-slice]"))) { ui.slice = ui.slice === el.dataset.slice ? null : el.dataset.slice; render(); return; }
    if (c("[data-clear-slice]")) { ui.slice = null; render(); return; }
    if (c("[data-clear-search]")) { ui.search = ""; $("#search").value = ""; render(); return; }
    if (c("[data-focus-search]")) { $("#search").focus(); return; }
    if ((el = c("[data-clear-filter]"))) { ui.filters[el.dataset.clearFilter].clear(); render(); return; }
    if ((el = c("[data-filter]"))) { filterPicker(el.dataset.filter, el); return; }
    if (c("[data-clear-all]")) { ui.slice = null; ui.search = ""; $("#search").value = ""; Object.values(ui.filters).forEach((s) => s.clear()); render(); return; }
    if ((el = c("#add-filter"))) { addFilterMenu(el); return; }
    if ((el = c("#view-options"))) { displayMenu(el); return; }
    if ((el = c("[data-totals]"))) { totalsPop(el); return; }
    // the margin card's (?) says how the margin is worked out, as every insight card's does (the lists' info-button)
    if ((el = c("[data-margin-info]"))) { const t = T.get("job"); openPop("info", el, `<div class="pop-note"><h3>Margin</h3><p>The profit as a share of the price: the price less the cost, divided by the price. Here ${money(t.profit, { whole: true })} on ${money(t.price, { whole: true })}, before any discount and tax.</p><p>The bar splits the cost: ${["l", "m", "s"].map((k) => `${PART[k][0].toLowerCase()} ${money(t[k], { whole: true })}`).join(", ")}. The job's totals are under Total with tax, at the table's foot.</p></div>`, { role: "dialog", label: "Margin", end: true, focus: false }); return; }
    if (c("#open-dims")) { openRecord("dims"); return; }
    if (c("#preview")) { toast("The proposal is Marco's side, not part of this concept"); return; }
    if ((el = c("[data-job-page]"))) { jobPage(el.dataset.jobPage); return; }
    if (c("#job-close")) { job.close(); if (fromJobs) location.href = "../index.html#jobs"; return; }
    if ((el = c("#job-more"))) { openPop("job", el, `<div class="pop-body">${mi("data-job-do=copy", "Copy the customer's link", "link")}${mi("data-job-do=pdf", "Download the estimate (PDF)", "file-pdf")}${mi("data-job-do=duplicate", "Duplicate the job", "copy")}</div>`, { label: "More for this job", end: true }); return; }
    if ((el = c("#job-saved"))) { historyPop(el); return; }
    if (c("#send")) { if (M.sent && !M.sent.changes) { toast("Sent on Oct 29. Change something and it can go again."); return; } openSend(); return; }
    if ((el = c("[data-bulk]"))) { const k = el.dataset.bulk; if (k === "delete") return confirmDelete(topChosen()); if (k === "optional" || k === "include") { const ls = chosenLeaves(); change(k === "optional" ? `${plural(ls.length, "line")} made optional` : `${plural(ls.length, "line")} included`, () => ls.forEach((x) => { if (k === "optional") { x.optional = true; x.included = false; } else if (x.optional) x.included = true; }), { toastUndo: true }); return; } bulkMenu(k, el); return; }
    if (c("[data-clear-selection]")) { ui.selected.clear(); render(); return; }
    if (c("[data-select-every]")) { ui.selected = new Set(order.map((x) => x.id)); render(); return; }
    if (c("[data-retry]")) { load(); return; }
  });
  const suggestSoon = () => requestAnimationFrame(() => { const i = $("#add-input"); if (i) addSuggest(i); });

  // the job's other pages aren't built; Measurements opens in the record's place. Picking a page that is here puts
  // it in the window (on phones the list and the page take turns: BolsterShell.workspace, D144)
  function jobPage(id) {
    if (id === "estimate" || id === "dims") BolsterShell.workspace.picked(job);
    if (id === "estimate") return;
    if (id === "dims") return openRecord("dims");
    toast(`${$(`[data-job-page="${id}"] span`).textContent}: not part of this concept`);
  }
  function historyPop(from) {
    const items = [...undoStack].reverse().slice(0, 12);
    openPop("history", from, `<div class="pop-head"><h3>Changes today</h3></div><div class="pop-body est-history">${items.length ? items.map((h, i) => `<div class="est-hist-row"><span class="est-hist-what">${esc(h.label)}</span><span class="est-muted">${h.at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>${i === 0 ? `<button type="button" class="button" data-variant="secondary" data-size="sm" data-undo>${ic("undo", 14)}Undo</button>` : ""}</div>`).join("") : `<p class="est-muted est-hist-none">Nothing changed yet. Every change saves as you make it, and shows here with Undo.</p>`}</div>`, { role: "dialog", label: "Changes to this estimate", end: true });
  }

  // the record: its own clicks (beside the list, or in the sheet)
  const recordClick = (e) => {
    const t = e.target, c = (s) => t.closest(s);
    let el;
    if (c("[data-close-record]")) { closeRecord(); return; }
    if ((el = c("[data-open-line]"))) { e.preventDefault(); openRecord(el.dataset.openLine); return; }
    if (c("[data-retry-record]")) { openRecord(ui.open); return; }
    if ((el = c("[data-edit]"))) { ui.edit = el.dataset.edit; renderRecord(); return; }
    if ((el = c("[data-edit-go]"))) { ui.edit = el.dataset.editGo; renderRecord(); return; }
    if ((el = c("[data-edit-dim]"))) { openRecord("dims", { edit: `dim-${el.dataset.editDim}`, focus: null }); return; }
    if (c("[data-goto-row]")) { $("[data-row=options] input", host())?.focus(); return; }
    if (c("[data-cancel]")) { stopEditing(); return; }
    // a chip names a value that's rarely set: it opens that value's field where its row goes
    if ((el = c("[data-reveal]"))) { const k = el.dataset.reveal; ui.revealed.add(k); ui.revealing = k; ui.edit = k; renderRecord(); return; }
    if (c("[data-add-option]")) { ui.edit = "addopt"; renderRecord(); return; }
    if (c("[data-to-selection]")) { toSelection(byId.get(ui.open)); return; }
    if (c("[data-save-catalog]")) { toast(`${byId.get(ui.open).name} saved to the catalog (concept: nothing leaves)`); return; }
    if (c("[data-clear-buy]")) { const x = byId.get(ui.open); ui.edit = null; change(`${x.name}: bought by the unit`, () => delete x.buy); return; }
    if (c("[data-open-dims]")) { openRecord("dims"); return; }
    if ((el = c("[data-insert]"))) { const f = $("#ed-formula", host()); f.setRangeText(el.dataset.insert, f.selectionStart, f.selectionEnd, "end"); f.focus(); f.dispatchEvent(new Event("input", { bubbles: true })); return; }
    if ((el = c("[data-rec-menu]"))) { const x = byId.get(ui.open); rowMenu(x, el); return; }
  };
  $("#detail").addEventListener("click", recordClick);
  $("#peek").addEventListener("click", (e) => { if (e.target === $("#peek")) return $("#peek").close(); recordClick(e); });
  $("#peek").addEventListener("close", () => { if (ui.open && !wideRecord()) { const id = ui.open; ui.open = null; ui.edit = null; $$("#est-wrap tr[data-open]").forEach((r) => r.removeAttribute("data-open")); $(`#est-wrap [data-open-line="${id}"]`)?.focus({ preventScroll: true }); } });
  const recordInput = (e) => {
    const t = e.target, form = t.closest("form[data-editor]");
    if (!form) return;
    if (t.name === "how") { $(".est-qty-typed", form).hidden = t.value !== "typed"; $(".est-qty-formula", form).hidden = t.value !== "formula"; ($(t.value === "typed" ? "#ed-qty" : "#ed-formula", form)).focus(); return; }
    if (t.id === "ed-formula") { $("#ed-formula-out", form).innerHTML = formulaOut(t.value, byId.get(ui.open).unit); t.removeAttribute("aria-invalid"); return; }
    if (t.dataset.partToggle) { const k = t.dataset.partToggle, inp = $(`#ed-${k}`, form); inp.disabled = !t.checked; t.closest(".est-part-row").toggleAttribute("data-on", t.checked); if (t.checked) { if (!inp.value) inp.value = "0.00"; inp.focus(); inp.select(); } }
    if (form.dataset.editor === "cost") { const sum = ["l", "m", "s"].reduce((s, k) => s + ($(`[name=on-${k}]`, form).checked ? numVal($(`#ed-${k}`, form).value) || 0 : 0), 0); $(".est-cost-sum", form).textContent = `${money(sum)} per ${byId.get(ui.open).unit}`; }
    if (t.id === "ed-margin") { const v = numVal(t.value) / 100, x = byId.get(ui.open); $("#ed-margin-out", form).textContent = v >= 0 && v < 1 ? `${markup(v)} markup · ${money(priceOf(unitCost(x), v))} per ${x.unit}` : "Between 0 and 99%"; }
    t.removeAttribute("aria-invalid");
  };
  [$("#detail"), $("#peek")].forEach((h) => {
    h.addEventListener("input", recordInput);
    h.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.pickOption != null) { const x = byId.get(ui.open), i = +t.dataset.pickOption; change(`${x.name}: ${x.chooser === "you" ? "picked" : "current option"} ${x.options[i].name}`, () => (x.current = i)); return; }
      if (t.dataset.trait != null) { const x = byId.get(ui.open), want = x.options[x.current ?? 0]?.t?.slice() || x.traits.map(([, v]) => v[0]); want[+t.dataset.trait] = t.value; const i = x.options.findIndex((o) => o.t.every((v, j) => v === want[j])); if (i >= 0) change(`${x.name}: current option ${x.options[i].name}`, () => (x.current = i)); return; }
      recordInput(e);
    });
    h.addEventListener("submit", (e) => { e.preventDefault(); commit(e.target); });
    // leaving an editor saves it (C-edit), unless it was left for its own Cancel
    h.addEventListener("focusout", (e) => {
      const form = e.target.closest("form[data-editor]");
      if (!form || form.dataset.editor === "addopt" || form.dataset.editor === "name") return;
      setTimeout(() => {
        if (!form.isConnected || form.contains(document.activeElement)) return;
        if (pop.contains(document.activeElement)) return;
        commit(form);
      }, 0);
    });
    h.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && e.target.closest("form[data-editor]")) { e.preventDefault(); e.stopPropagation(); stopEditing(); }
    });
  });

  // the popover's own clicks and picks
  pop.addEventListener("click", (e) => {
    const t = e.target, c = (s) => t.closest(s);
    let el;
    if ((el = c("[data-pick-filter]"))) { closePop(); filterPicker(el.dataset.pickFilter, $("#add-filter")); return; }
    if ((el = c("[data-group]"))) { ui.group = el.dataset.group; closePop(); render(); return; }
    if ((el = c("[data-col]"))) { ui.cols[el.dataset.col] = !ui.cols[el.dataset.col]; render(); displayMenu($("#view-options")); return; }
    if ((el = c("[data-fold-to]"))) { ui.foldAssemblies = el.dataset.foldTo === "assemblies"; closePop(); render(); return; }
    if ((el = c("[data-row-do]"))) { rowDo(el.dataset.rowDo, byId.get(el.dataset.line), el); return; }
    if ((el = c("[data-bulk-stage]"))) { const ls = chosenLeaves(); closePop(); change(`${plural(ls.length, "line")} to ${el.dataset.bulkStage}`, () => ls.forEach((x) => (x.stage = el.dataset.bulkStage)), { toastUndo: true }); return; }
    if ((el = c("[data-bulk-assign]"))) { const ls = chosenLeaves(), p = person(el.dataset.bulkAssign); closePop(); change(`${plural(ls.length, "line")} assigned to ${p?.name || "nobody"}`, () => ls.forEach((x) => (x.assignee = p?.id || null)), { toastUndo: true }); return; }
    if ((el = c("[data-bulk-move]"))) { const to = el.dataset.bulkMove === "root" ? null : byId.get(el.dataset.bulkMove), xs = topChosen(); closePop(); ui.selected.clear(); change(`Moved ${xs.length === 1 ? xs[0].name : plural(xs.length, "line")} to ${to ? to.name : "the top level"}`, () => { remove(xs); (to ? to.children : M.tree).push(...xs); }, { toastUndo: true }); if (to) ui.folded.delete(to.id); return; }
    if ((el = c("[data-bulk-do]"))) {
      const xs = topChosen(); closePop();
      if (el.dataset.bulkDo === "combine") { const parentList = listOf(xs[0]), at = Math.min(...xs.map((x) => parentList.indexOf(x))), a = { id: `n${++M.seq}`, kind: "assembly", name: "New assembly", qty: 1, unit: "each", children: [] }; ui.selected.clear(); change(`Combined ${plural(xs.length, "line")} as an assembly`, () => { remove(xs); a.children.push(...xs); parentList.splice(at, 0, a); }, { toastUndo: true }); openRecord(a.id, { edit: "name" }); return; }
      if (el.dataset.bulkDo === "duplicate") { change(`Duplicated ${plural(xs.length, "line")}`, () => xs.forEach((x) => { const y = reId(x); y.name = `${x.name} (copy)`; const l = listOf(x); l.splice(l.indexOf(x) + 1, 0, y); }), { toastUndo: true }); return; }
      if (el.dataset.bulkDo === "catalog") { toast(`${plural(xs.length, "line")} saved to the catalog (concept: nothing leaves)`); return; }
    }
    if ((el = c("[data-catalog]"))) { addLine(null, CATALOG[+el.dataset.catalog]); return; }
    if ((el = c("[data-create]"))) { addLine(el.dataset.create); return; }
    if (c("[data-undo]")) { closePop(); undo(); return; }
    if ((el = c("[data-job-do]"))) { closePop(); toast(el.dataset.jobDo === "copy" ? "Link copied (concept: a made-up link)" : "Not part of this concept"); return; }
  });
  pop.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.pick) { const set = ui.filters[t.dataset.pick]; t.checked ? set.add(t.value) : set.delete(t.value); render(); }
  });
  pop.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.dataset.bulkForm === "margin") { const v = numVal($("#bulk-margin", pop).value); if (!(v >= 0 && v < 100)) { $("#bulk-margin", pop).setAttribute("aria-invalid", "true"); return; } const ls = chosenLeaves().filter((l) => l.kind !== "fee"); closePop(); change(`${plural(ls.length, "line")} at ${v}% margin`, () => ls.forEach((x) => (x.margin = v / 100)), { toastUndo: true }); }
  });
  pop.addEventListener("input", (e) => {
    if (e.target.id === "tot-discount") { const v = numVal(e.target.value); clearTimeout(pop._d); pop._d = setTimeout(() => change(`Discount ${money(Number.isFinite(v) ? v : 0)}`, () => (M.job.discount = Number.isFinite(v) ? v : 0)), 500); }
  });

  // the add field: type, Enter, type, Enter; arrows walk the suggestions; Escape closes it
  job.addEventListener("input", (e) => {
    if (e.target.id === "add-input") addSuggest(e.target);
    if (e.target.id === "search") { ui.search = e.target.value; render(); }
  });
  job.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.id === "add-input") {
      const items = $$(".menu-item", pop);
      if (e.key === "Enter") { e.preventDefault(); const act = items.find((i) => i.hasAttribute("data-active")); if (act) act.click(); else if (t.value.trim()) addLine("item"); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const i = items.findIndex((x) => x.hasAttribute("data-active")); items.forEach((x) => x.removeAttribute("data-active")); const n = items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length + (i < 0 && e.key === "ArrowUp" ? 1 : 0)) % items.length]; n?.setAttribute("data-active", ""); n?.scrollIntoView({ block: "nearest" }); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePop(); const was = ui.adding; ui.adding = null; addText = ""; render(); $(`[data-add="${was}"]`)?.focus(); return; }
    }
    if (e.key === "Escape" && !e.defaultPrevented) {
      if (pop.matches(":popover-open")) return;
      if (ui.open && wideRecord()) { e.preventDefault(); closeRecord(); return; }
      if (ui.selected.size) { e.preventDefault(); ui.selected.clear(); render(); return; }
    }
    if (e.key === "/" && !t.closest("input, textarea, select")) { e.preventDefault(); $("#search").focus(); }
  });
  job.addEventListener("focusout", (e) => {
    if (e.target.id !== "add-input") return;
    setTimeout(() => { if (document.activeElement === $("#add-input") || pop.contains(document.activeElement)) return; if (!$("#add-input")?.value.trim()) { ui.adding = null; closePop(); render(); } }, 120);
  });
  // a modal window: Escape closes it unless something inside it is open (the browser's own cancel)
  job.addEventListener("cancel", (e) => { if (ui.open && wideRecord()) { e.preventDefault(); closeRecord(); } else if (ui.selected.size) { e.preventDefault(); ui.selected.clear(); render(); } });
  job.addEventListener("close", () => { if (fromJobs) location.href = "../index.html#jobs"; });
  $("[data-open-job]").addEventListener("click", () => BolsterShell.workspace.open(job));

  // the send dialog
  $("#send-dialog").addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-close]")) { $("#send-dialog").close(); return; }
    const g = t.closest("[data-goto-line]");
    if (g) { $("#send-dialog").close(); const x = byId.get(g.dataset.gotoLine), n = needsOf(x); pathOf(x).forEach((a) => ui.folded.delete(a.id)); render(); $(`tr[data-id="${x.id}"]`)?.scrollIntoView({ block: "center" }); if (n.includes("choose")) openRecord(x.id); else if (qtyOf(x).missing) openRecord("dims", { edit: `dim-${qtyOf(x).missing[0]}`, focus: null }); else openRecord(x.id, { edit: n.includes("qty") ? "qty" : n.includes("nocost") ? "cost" : null, focus: n.length ? null : "title" }); return; }
    if (t.closest("[data-send-now]")) { $("#send-dialog").close(); const again = !!M.sent; M.sent = { at: Date.now(), changes: 0 }; persist(); render(); toast(again ? "Sent again to Marco, with what changed (concept: nothing leaves)" : "Sent to Marco (concept: nothing leaves). The job is pending until he answers."); }
  });

  // concept controls
  $$("input[name=cc-net]").forEach((r) => r.addEventListener("change", () => { net = r.value; load(); }));
  // the record: as it is, or comfortable (bigger, plainer, a summary that answers first), kept in this browser
  const RECORD_KEY = "bolster-concepts:estimate:record";
  const setRecord = (v) => {
    if (v === "comfortable") document.documentElement.dataset.record = v; else delete document.documentElement.dataset.record;
    $$("input[name=cc-record]").forEach((r) => (r.checked = r.value === (v || "standard")));
    try { localStorage.setItem(RECORD_KEY, v || "standard"); } catch {}
    if (ui.open) renderRecord();
  };
  $$("input[name=cc-record]").forEach((r) => r.addEventListener("change", () => setRecord(r.value)));
  try { setRecord(localStorage.getItem(RECORD_KEY)); } catch { setRecord(null); }
  $("#cc-reset").addEventListener("click", () => { M = fresh(); undoStack.length = 0; ui.selected.clear(); closeRecord(); index(); compute(); persist(); render(); toast("The estimate is back to how it started"); });

  // the record follows the window: beside the list from 1280, a sheet below
  matchMedia("(min-width: 1280px)").addEventListener("change", () => { if (ui.open) openRecord(ui.open, { focus: null }); });
  addEventListener("resize", () => { if (pop.matches(":popover-open")) place(popFor?.kind === "row" || popFor?.kind === "display" || popFor?.kind === "totals" || popFor?.kind === "history" || popFor?.kind === "job"); });

  // ---------- start ----------
  BolsterShell.mount({ current: "job-list", links: { "job-list": "../index.html#jobs", invoices: "../index.html#invoices", "leads-and-customers": "../index.html#customers", catalog: "../index.html#catalog", calendar: "../calendar/", tasks: "../tasks/", pipeline: "../pipeline/", timeline: "../timeline/" } });
  index(); compute();
  $("#job-nav").innerHTML = navHtml();
  BolsterShell.workspace.foldButton($("#job-fold"), job, "job menu");
  BolsterShell.canvas.start($("#job-page"));
  // the table's header sticks right under its toolbar, which grows when filters show as chips: it follows the toolbar
  new ResizeObserver(([e]) => $(".est-panel").style.setProperty("--_toolbar-h", `${e.borderBoxSize[0].blockSize}px`)).observe($(".est-toolbar"));
  BolsterShell.workspace.open(job);
  render();
  // the window opens on its estimate: focus on the page, not the first control in the bar
  $("#est-title").setAttribute("tabindex", "-1"); $("#est-title").focus({ preventScroll: true });
  window.__est = { M, ui, T: () => T, render };
})();
