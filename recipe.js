// The renderer's front half: turns a page description (system/recipes/list/schema.json) into the
// list config data-list.js draws, with sample rows made up from each column's type. Nothing here is
// per-list: everything a description doesn't say comes from the rules (rules.json → types).
//   index.html?from=description            the concept's four lists, built from their descriptions
//   index.html?d=path/to/description.json  one more list, built from any description
// What a description can't express (a custom figure in a card's note, an insight's sum) is listed in
// BDS_RECIPE.notes and shown in the page, never faked.

window.BDS_RECIPE = (() => {
  const { fmt, esc, TODAY, ageDays, kit } = window.BDS_CONCEPT;
  const { seeded, hash, initials, money, daysAgo, daysFrom, sum, avatar, person, main, PHOTOS, OWNERS, CLIENTS, CITIES, STREETS, JOBS, SOURCES, VENDORS, CATALOG, emailOf } = kit;
  const NUMERIC = new Set(["money", "number", "percent", "count", "duration"]);
  // the first click on a header sorts the type's way (rules.json → types): biggest, newest and most
  // flagged first; names, words and the lifecycle from the top
  const DESC = new Set([...NUMERIC, "date", "datetime", "flags"]);
  const WIDTH = { kinds: "5.5rem", id: "6rem", money: "7rem", number: "5rem", percent: "5.5rem", count: "7rem", duration: "6rem", date: "6.5rem", datetime: "8rem", status: "7.5rem", person: "12.5rem", record: "12rem", category: "7rem", address: "11rem", contact: "14rem", text: "8rem", flags: "11rem" };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- a stage's look (rule L-status-stage): the colour and, where the system has one, the shape ----------
  const STAGE = {
    new: { attr: 'data-status="lead"', dot: "var(--color-status-lead-dot)" },
    draft: { attr: 'data-status="draft"', dot: "var(--color-status-draft-mark)", mark: "dashed" },
    waiting: { attr: 'data-status="pending"', dot: "var(--color-status-pending-mark)", mark: "quarter" },
    won: { attr: 'data-status="booked"', dot: "var(--color-status-booked-dot)", mark: "half" },
    underway: { attr: 'data-status="in-progress"', dot: "var(--color-status-in-progress-mark)", mark: "three" },
    done: { attr: 'data-tone="success"', dot: "var(--color-feedback-success-accent)" },
    lost: { attr: 'data-tone="danger"', dot: "var(--color-feedback-danger-accent)", mark: "slash" },
    late: { attr: 'data-tone="danger"', dot: "var(--color-feedback-danger-accent)" },
    neutral: { attr: 'data-tone="neutral"', dot: "var(--color-line-strong)" },
  };
  const badge = (s) => `<span class="badge" ${s.attr}${s.mark ? ` data-mark="${s.mark}"` : ""}>${esc(s.label)}</span>`;
  // how often each stage turns up in sample data
  const WEIGHT = { new: 24, draft: 12, waiting: 30, won: 20, underway: 22, done: 34, lost: 12, late: 14, neutral: 30 };

  // ---------- sample values, by type and by what the key sounds like ----------
  const TRADES = ["Drywall", "Insulation", "Framing", "Painting", "Electrical", "Plumbing"];
  const FLAGS = ["COI missing", "Licence missing", "W-9 missing"];
  const UNITS = ["sheet", "sq ft", "lin ft", "each", "hour", "gallon"];
  // a different company on every row: 16 names × 8 trades
  const PREFIX = ["Northline", "Precision", "Summit", "BlueRidge", "Harbor", "Crestview", "Ironwood", "Keystone", "Lakeshore", "Granite", "Redline", "Cedar", "Copperleaf", "Westbrook", "Pioneer", "Oakmont"];
  const TRADE = ["Framing", "Drywall Co.", "Insulation", "Electric", "Plumbing", "Painting", "Supply", "Roofing"];
  const company = (i) => `${PREFIX[(i * 7) % PREFIX.length]} ${TRADE[Math.floor(i / PREFIX.length) % TRADE.length]}`;
  const ITEMS = Object.entries(CATALOG).flatMap(([cat, list]) => list.map(([name, unit, cost]) => ({ name, unit, cost, cat })));
  function sample(r, n) {
    const int = (a, b) => Math.floor(a + r() * (b - a + 1));
    const pick = (a) => a[Math.floor(r() * a.length)];
    const weighted = (pairs) => { let x = r() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) if ((x -= w) <= 0) return v; return pairs[0][0]; };
    const recordOf = (name) => ({ id: `r${hash(name)}`, name, initials: initials(name), color: (hash(name) % 8) + 1 });
    return (f, row, i) => {
      const k = f.key.toLowerCase();
      switch (f.type) {
        case "id": return `${(n.one.slice(0, 3) || "rec").toUpperCase()}-${1040 + i}`;
        case "money": if (row._item && /cost/.test(k)) return row._item.cost; if (row._item && /price/.test(k)) return Math.round(row._item.cost * 1.35 * 100) / 100; return r() < 0.06 ? 0 : money(380, 62000);
        case "number": return int(1, 40);
        case "percent": return [0.25, 0.3, 0.35, 0.4, 0.5][int(0, 4)];
        case "count": return r() < 0.15 ? 0 : int(1, 24);
        case "duration": return int(1, 90);
        case "date": case "datetime": return /due|scheduled|start/.test(k) ? daysFrom(TODAY, int(-40, 45)) : daysAgo(int(0, 240));
        case "person": return weighted([[OWNERS[0], 40], [OWNERS[1], 25], [OWNERS[2], 20], [OWNERS[3], 15]]);
        case "record": return /client|customer/.test(k) ? row._client : recordOf(/vendor|sub|supplier/.test(k) ? pick(VENDORS) : `${pick(JOBS)}`);
        case "address": return /city/.test(k) ? row._client.city : row._client.address;
        case "contact": return { email: emailOf(row._client), phone: `(555) ${int(200, 899)}-${String(int(0, 9999)).padStart(4, "0")}` };
        case "flags": return r() < 0.45 ? [] : FLAGS.filter(() => r() < 0.5).slice(0, 3);
        // an item's photo where the sample has one; the rest show the thumbnail's placeholder (D55)
        case "image": return row._item ? PHOTOS[row._item.name]?.[0] ?? null : null;
        case "kinds": { const vs = (f.values || []).map((v) => v.value); const some = vs.filter(() => r() < 0.45); return some.length ? some : [pick(vs)]; }
        case "category": return row._item && /category/.test(k) ? row._item.cat : /source/.test(k) ? pick(SOURCES) : /vendor|supplier/.test(k) ? pick(VENDORS) : /category/.test(k) ? pick(Object.keys(CATALOG)) : /work|trade/.test(k) ? pick(TRADES) : /contain|kind/.test(k) ? pick(["Materials", "Labour", "Materials and labour"]) : `${f.label || cap(f.key)} ${"ABC"[int(0, 2)]}`;
        case "name":
          if (/number|code|^id$/.test(k)) return `${(n.one.slice(0, 3) || "rec").toUpperCase()}-${1040 + i}`;
          if (/item|product|material/.test(k) || /item|product|material/.test(n.one)) { row._item = pick(ITEMS); return row._item.name; }
          if (/job|project|quote|estimate/.test(k) || /job|project|quote|estimate/.test(n.one)) return pick(JOBS);
          return /vendor|sub|supplier|company/.test(k + n.one) ? company(i) : row._client.name;
        default: return /unit/.test(k) ? row._item?.unit || pick(UNITS) : /job|project|quote/.test(k) ? pick(JOBS) : `${f.label || cap(f.key)} ${i + 1}`;
      }
    };
  }

  // ---------- how each type reads (rules.json → types) ----------
  const shortDate = (d) => (Math.abs(ageDays(d)) < 7 ? fmt.ago(d) : fmt.date(d));
  // what a row holds, in its column's order, as one phrase: “Labor”, “Labor and materials”
  const kindsOf = (c, v) => (c.values || []).filter((o) => (v || []).includes(o.value));
  const kindsText = (c, v) => kindsOf(c, v).map((o, i) => (i ? o.label.toLowerCase() : o.label)).join(", ").replace(/, ([^,]*)$/, " and $1");
  // the icons share one tooltip that names them together (D52, D53), as it does for screen readers
  const kindsIcons = (c, v) => (kindsOf(c, v).length ? `<span class="cell-kinds" role="img" aria-label="${esc(kindsText(c, v))}" data-tip="${esc(kindsText(c, v))}">${kindsOf(c, v).map((o) => window.BolsterIcons(o.icon, 14)).join("")}</span>` : "");
  const text = (v) => {
    if (v == null || v === "") return "";
    if (v instanceof Date) return shortDate(v);
    if (typeof v === "object") return v.name ?? v.email ?? (Array.isArray(v) ? v.join(", ") : "");
    return String(v);
  };
  function cellOf(c, empty) {
    const none = (s) => `<span class="text-tertiary">${esc(c.empty || s)}</span>`;
    const muted = (s) => `<span class="cell-muted">${esc(s)}</span>`;
    switch (c.type) {
      case "money": return (x) => (x[c.key] ? fmt.money(x[c.key]) : none(fmt.money(0)));
      case "number": return (x) => fmt.count(x[c.key]);
      case "percent": return (x) => fmt.pct(x[c.key]);
      case "count": return (x) => (x[c.key] ? (c.unit ? fmt.plural(x[c.key], c.unit, `${c.unit}s`) : fmt.count(x[c.key])) : none("–"));
      case "duration": return (x) => fmt.plural(x[c.key], c.unit || "day", `${c.unit || "day"}s`);
      case "date": return (x) => muted(shortDate(x[c.key]));
      case "datetime": return (x) => muted(ageDays(x[c.key]) <= 1 ? `${fmt.ago(x[c.key])} ${x[c.key].toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "")}` : shortDate(x[c.key]));
      case "status": return (x) => badge(empty.statusMap[x[c.key]]);
      case "person": return (x) => person(x[c.key]);
      case "record": return (x) => `<span class="cell-person">${avatar(x[c.key], "sm")}${esc(x[c.key].name)}</span>`;
      case "contact": return (x) => `<div>${esc(x[c.key].email)}</div><div class="cell-sub">${esc(x[c.key].phone)}</div>`;
      case "flags": return (x) => (x[c.key].length ? `<span class="cluster" style="gap:var(--space-1)">${x[c.key].slice(0, 2).map((f) => `<span class="badge" data-tone="warning">${esc(f)}</span>`).join("")}${x[c.key].length > 2 ? `<span class="badge">+${x[c.key].length - 2}</span>` : ""}</span>` : "");
      case "id": case "address": case "category": return (x) => muted(text(x[c.key]));
      case "kinds": return (x) => kindsIcons(c, x[c.key]);
      default: return (x) => (x[c.key] ? esc(text(x[c.key])) : none("–"));
    }
  }
  const sortOf = (c, statusOrder) => {
    if (c.type === "status") return (x) => statusOrder.indexOf(x[c.key]);
    if (NUMERIC.has(c.type)) return (x) => x[c.key] || 0;
    if (c.type === "date" || c.type === "datetime") return (x) => +x[c.key];
    if (c.type === "flags") return (x) => x[c.key].length;
    if (c.type === "kinds") return (x) => (x[c.key] || []).join(" ");
    return (x) => text(x[c.key]).toLowerCase();
  };
  // {key} templates: a missing value drops with its separator
  const fill = (t, x) => (t || "").split(/\s+[·•–-]\s+/).map((part) => part.replace(/\{([a-zA-Z0-9]+)\}/g, (_, k) => text(x[k]))).filter((s) => s.trim()).join(" · ");

  function compile(d, { id } = {}) {
    const notes = [];
    const n = { one: d.noun.one, many: d.noun.many };
    const r = seeded(hash(d.nav));
    const fields = [...(d.fields || []), ...d.columns];
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    const statusCol = d.status?.column;
    const stored = (d.status?.values || []).filter((v) => !v.derived);
    const order = (d.status?.values || []).map((v) => v.value);
    // the status shapes (dashed, quarter, half…) are the job list's own (D49): elsewhere a stage is its
    // colour, a dot on its card and a plain tinted badge
    const shapes = d.status?.marks === true && d.nav === "job-list";
    const statusMap = Object.fromEntries((d.status?.values || []).map((v) => { const { mark, ...look } = STAGE[v.stage]; return [v.value, { label: v.label, ...look, ...(shapes && mark ? { mark } : {}) }]; }));

    // ---------- rows ----------
    const gen = sample(r, n);
    const pickClient = () => CLIENTS[Math.floor(r() * CLIENTS.length)];
    const rows = Array.from({ length: 96 }, (_, i) => {
      const x = { id: `${id || d.nav}-${i + 1}`, _client: pickClient() };
      for (const f of fields) if (f.type !== "status" && f.type !== "image") x[f.key] = gen(f, x, i);
      for (const f of fields) if (f.type === "image") x[f.key] = gen(f, x, i); // once the name has picked its item
      if (statusCol) {
        let x2 = r() * stored.reduce((s, v) => s + (WEIGHT[v.stage] || 10), 0);
        x[statusCol] = stored.find((v) => (x2 -= WEIGHT[v.stage] || 10) <= 0)?.value || stored[0].value;
        // a derived status (past due) takes some of the rows of the status listed just before it
        d.status.values.forEach((v, j) => { if (v.derived && j && x[statusCol] === order[j - 1] && r() < 0.35) x[statusCol] = v.value; });
      }
      return x;
    });

    // ---------- columns: alignment, width, phone slot and visibility follow type and priority ----------
    const name = d.columns.find((c) => c.priority === 1);
    // the key figure is priority 2 (L-priority); a list without one shows none
    const figure = d.columns.find((c) => c.priority === 2 && NUMERIC.has(c.type));
    const dates = d.columns.filter((c) => (c.type === "date" || c.type === "datetime") && !c.hidden).sort((a, b) => a.priority - b.priority);
    const empty = { statusMap };
    // a kinds column is a column of its own, its icons on the phone row's overline (L-types, D53)
    const kindsCol = d.columns.find((c) => c.type === "kinds");
    const columns = d.columns.map((c) => {
      const out = { key: c.key, label: c.label, hidden: !!c.hidden, sort: sortOf(c, order), dir: DESC.has(c.type) ? "desc" : "asc" };
      if (c.priority === 1) {
        out.m = "title"; out.required = true;
        out.render = (x) => main(x.id, fill(c.title || `{${c.key}}`, x) || c.empty || `Unnamed ${n.one}`, fill(c.detail, x), c.leading === "thumbnail" ? { thumb: c.thumbFrom ? x[c.thumbFrom] : null } : c.leading === "avatar" && c.avatarFrom ? (typeof x[c.avatarFrom] === "object" ? x[c.avatarFrom] : { initials: initials(text(x[c.avatarFrom]) || "?"), color: (hash(text(x[c.avatarFrom])) % 8) + 1 }) : null);
        out.sort = (x) => fill(c.title || `{${c.key}}`, x).toLowerCase();
        return out;
      }
      out.w = WIDTH[c.type] || "8rem";
      out.render = cellOf(c, empty);
      if (NUMERIC.has(c.type)) out.numeric = true;
      if (c.total) { out.total = true; out.totalFmt = c.type === "money" ? fmt.money : fmt.count; }
      if (c === figure) out.m = "trail";
      else if (c.type === "status" && c.key === statusCol) out.m = "badge";
      else if (c === dates[0]) out.m = "sub";
      else if (c.type === "flags") out.m = "flags"; // under the name on phones; leaves by priority elsewhere
      if (!out.m || out.m === "flags") out.hideBelow = c.priority >= 6 ? "lg" : "md";
      return out;
    });

    // ---------- phones (L-phone-row): the id and the top date on the overline, the name's detail (less the id) under the name ----------
    const idKey = fields.find((f) => f.type === "id")?.key;
    const titleT = name.title || `{${name.key}}`;
    const dateCol = dates[0] && columns.find((c) => c.key === dates[0].key);
    const phone = {
      over: (x) => (kindsCol ? kindsIcons(kindsCol, x[kindsCol.key]) : "") + [idKey && !titleT.includes(`{${idKey}}`) ? esc(text(x[idKey])) : "", dateCol ? dateCol.render(x) : ""].filter(Boolean).join(" · "),
      where: (x) => esc(fill(name.detail, idKey ? { ...x, [idKey]: "" } : x)),
    };

    // ---------- filters: the picker comes from the type ----------
    const valuesOf = (k) => [...new Set(rows.map((x) => text(x[k])).filter(Boolean))].sort();
    const filters = d.filters.map((f) => {
      const c = byKey[f.column], base = { key: c.key, label: c.label, pinned: !!f.pinned };
      if (c.type === "status") return { ...base, type: "enum", get: (x) => x[c.key], options: d.status.values.map((v) => ({ value: v.value, label: v.label, html: badge(statusMap[v.value]) })) };
      if (c.type === "person") return { ...base, type: "enum", get: (x) => x[c.key].id, options: OWNERS.map((o) => ({ value: o.id, label: o.me ? `${o.name} (you)` : o.name, html: `${avatar(o, "sm")}${esc(o.me ? `${o.name} (you)` : o.name)}` })) };
      if (c.type === "date" || c.type === "datetime") return { ...base, type: "date", get: (x) => x[c.key] };
      if (NUMERIC.has(c.type)) return { ...base, type: "range", get: (x) => x[c.key], ...(c.type === "money" ? { prefix: "$" } : c.type === "percent" ? { suffix: "%", scale: 100 } : c.unit || c.type === "duration" ? { suffix: `${c.unit || "day"}s` } : {}) };
      if (c.type === "address") return { ...base, type: "enum", get: (x) => text(x[c.key]).split(", ").pop(), options: CITIES.map((v) => ({ value: v, label: v })) };
      if (c.type === "kinds") return { ...base, type: "enum", get: (x) => x[c.key], options: c.values.map((v) => ({ value: v.value, label: v.label, html: `${window.BolsterIcons(v.icon, 14)}${esc(v.label)}` })) };
      if (c.type === "flags") return { ...base, type: "enum", get: (x) => x[c.key][0] || "Clear", options: [...FLAGS, "Clear"].map((v) => ({ value: v, label: v })) };
      return { ...base, type: "enum", get: (x) => text(x[c.key]), options: valuesOf(c.key).map((v) => ({ value: v, label: v })), ...(c.type === "record" ? { searchable: true } : {}) };
    });

    // ---------- the cards (rule L-summary) ----------
    const measure = (m) => (s) => {
      if (m.agg === "count") return fmt.count(s.length);
      const total = sum(s, (x) => x[m.column] || 0);
      const v = m.agg === "average" ? (s.length ? total / s.length : 0) : total;
      return byKey[m.column]?.type === "money" ? fmt.money0(v) : fmt.count(Math.round(v));
    };
    const note = (t, s, m) => (t || "").replace(/\{count\}/g, fmt.plural(s.length, n.one, n.many)).replace(/\{sum\}/g, measure({ ...m, agg: m.agg === "count" ? "count" : "sum" })(s));
    const metrics = (d.summary?.slices || []).map((sl) => {
      const custom = (sl.note || "").match(/\{(?!count\}|sum\})[a-zA-Z]+\}/);
      if (custom) notes.push(`The ${statusMap[sl.value].label} card's line uses ${custom[0]}, a custom figure: it shows the count instead.`);
      return { value: sl.value, label: statusMap[sl.value].label, noCount: sl.count === false, big: measure(sl.measure), sub: (s) => (custom || !sl.note ? fmt.plural(s.length, n.one, n.many) : note(sl.note, s, sl.measure)) };
    });
    // explanations name statuses and labels as the screen shows them (D27): {booked} → Booked, [Label] → Label
    const words = (t) => t.replace(/\{([a-z-]+)\}/g, (_, v) => statusMap[v]?.label || v).replace(/\[([^\]]+)\]/g, "$1");
    if (d.summary?.insight) notes.push(`“${d.summary.insight.label}” is a custom figure (${words(d.summary.insight.explain)}), so it's left out until the renderer has code for it.`);

    // ---------- views ----------
    const viewFilters = (fs = {}) => Object.fromEntries(Object.entries(fs).map(([k, v]) => [k, Array.isArray(v) ? v.map((x) => (x === "me" ? OWNERS[0].id : x)) : v]));
    const views = (d.views?.length ? d.views : [{ id: "all", label: `All ${n.many}`, icon: "list", filters: {} }])
      .map((v) => ({ id: v.id, label: v.label, icon: v.icon || "list", filters: viewFilters(v.filters), ...(v.sort ? { sort: { key: v.sort.column, dir: v.sort.dir } } : {}), ...(v.group !== undefined ? { group: v.group } : {}) }));

    // ---------- actions ----------
    const label = (a) => (typeof a === "string" ? a : a.label);
    const act = (a) => (typeof a === "string" ? a : a.menu ? { label: a.label, icon: "status", items: a.menu } : a.label);
    const ICON = { Edit: "pen", Duplicate: "copy", Send: "send", "Send now": "send", "Send reminder": "bell", Message: "message", Archive: "archive", Delete: "trash", Download: "download", "Record payment": "credit-card", "Mark as paid": "credit-card", "Create job": "file-plus", "Invoice this project": "file-invoice", "Review customer": "star" };
    // L-next-step: a row's next step leads its record and its ··· menu (rows carry no buttons)
    const nextOf = (x) => (statusCol && d.actions?.next?.byStatus?.[x[statusCol]]) || null;
    const lead = (x, list) => { const nx = nextOf(x); return nx ? [nx, ...list.filter((a) => label(a) !== label(nx))] : list; };
    const recordActions = (x) => {
      const list = lead(x, d.actions?.byStatus ? d.actions.byStatus[x[statusCol]]?.primary || [] : (d.actions?.row || []).filter((a) => !/^(open|edit)$/i.test(label(a))));
      return list.filter((a) => typeof a === "string" || !a.menu).slice(0, 2).map((a) => [label(a), ICON[label(a)] || "pen"]);
    };
    const actionsFor = d.actions?.byStatus && (
      (sel) => sel.length !== 1
        ? { bar: (d.selection.bulk || []).map(act), more: [] }
        : { bar: lead(sel[0], d.actions.byStatus[sel[0][statusCol]]?.primary || []).map(act), more: (d.actions.byStatus[sel[0][statusCol]]?.more || []).map(act) });
    if (d.selection.enabled && !d.selection.bulk?.length) notes.push("Bulk actions are still an open question, so the bar shows none.");

    // ---------- the record (peek) ----------
    const recordFields = d.record?.fields || d.columns.filter((c) => c.priority >= 4).map((c) => c.key);
    const peek = (x) => ({
      heading: d.record?.heading ? fill(d.record.heading, x) : fill(name.title || `{${name.key}}`, x),
      open: d.record?.openLabel || `Open ${n.one}`,
      badge: statusCol ? badge(statusMap[x[statusCol]]) : "",
      amount: figure && x[figure.key] ? (figure.type === "money" ? fmt.money(x[figure.key]) : text(x[figure.key])) : null,
      empty: figure?.empty || "–",
      sub: fill(name.detail, x),
      timeline: d.record?.timeline === false ? [] : [{ what: `${cap(n.one)} created`, meta: fmt.date(dates[0] ? x[dates[0].key] : TODAY) }],
      actions: recordActions(x),
      // each field reads as its type does in the list (L-types): money as money, a date as a date
      fields: recordFields.filter((k) => byKey[k]).map((k) => [byKey[k].label || cap(k), byKey[k].type === "person" ? person(x[k]) : byKey[k].type === "status" ? badge(statusMap[x[k]]) : byKey[k].type === "kinds" ? esc(kindsText(byKey[k], x[k]) || "–") : x[k] == null || x[k] === "" ? "–" : cellOf(byKey[k], { statusMap })(x)]),
      doc: d.record?.document ? { label: d.record.document, name: `${d.record.document.replace(/\s+/g, "-")}-${idKey ? text(x[idKey]) : x.id}.pdf`, view: `View ${d.record.document.toLowerCase()}` } : null,
    });

    const searchKeys = d.search.columns;
    return {
      id: id || d.nav, nav: d.nav, title: cap(n.many), noun: [n.one, n.many],
      create: d.create?.label || "", rowClick: d.rowClick, fromDescription: true, notes,
      rows,
      search: (x) => searchKeys.map((k) => text(x[k])).join(" "),
      searchHint: d.search.hint,
      searchIn: searchKeys.filter((k) => k !== name.key && d.columns.some((c) => c.key === k)),
      dateKey: d.dateRange?.column || null,
      cardKey: metrics.length ? statusCol : null,
      metrics, insight: null,
      allCard: d.summary?.all ? { big: measure(d.summary.all) } : null,
      statusMap: statusCol ? statusMap : null,
      columns, filters, phone,
      groups: d.group?.options || [],
      defaultSort: { key: d.sort.column, dir: d.sort.dir },
      views,
      bulk: (d.selection.bulk || []).map(label),
      rowActions: d.actions?.row ? d.actions.row.map(label) : ["Open"],
      danger: [...(d.actions?.row || []), ...(d.selection.bulk || []), ...Object.values(d.actions?.byStatus || {}).flatMap((s) => [...(s.primary || []), ...(s.more || [])])].filter((a) => typeof a === "object" && a.tone === "danger").map(label),
      ...(actionsFor ? { actionsFor } : {}),
      selectable: !!d.selection.enabled,
      export: !!d.export,
      ...(d.actions?.next ? { nextFor: (x) => (nextOf(x) ? label(nextOf(x)) : null) } : {}),
      peek,
    };
  }
  return { compile };
})();
