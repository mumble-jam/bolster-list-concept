// Data list concept: renders any list config from data.js.
// One state object per list; every change goes through set() and re-renders.
// Layout (round 2): slice cards, then the table card with its own header (filter, search, period,
// display; chips below), rows that load as you scroll, and a floating bar for bulk actions.

(() => {
  const { configs, fmt, esc, TODAY, attrIcons, actionIcons } = window.BDS_CONCEPT;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const ic = window.BolsterIcons;
  const I = {
    plus: ic("circle-plus", 14), chev: ic("chevron-down", 14), x: ic("xmark", 14), check: ic("check", 14), chevR: ic("chevron-right", 12), chevL: ic("chevron-left", 14),
    dots: ic("ellipsis", 16), help: ic("circle-help", 14), xl: ic("xmark", 16),
    search: ic("search", 24), inbox: ic("inbox", 24), alert: ic("triangle-exclamation", 16),
  };
  // a menu row's leading icon: 14px Regular, in a fixed-width slot so the labels line up
  const mi = (name) => (name ? `<span class="menu-icon">${ic(`m-${name}`, 14)}</span>` : "");
  const STEP = 25; // rows per load

  // ---------- state ----------
  let cfg;
  let st;
  const saved = {};
  const clone = (o) => JSON.parse(JSON.stringify(o ?? {}));
  const filterDef = (key) => cfg.filters.find((f) => f.key === key);

  function fresh(c) {
    const v = c.views[0];
    return {
      view: v.id, filters: clone(v.filters), added: [], terms: [], search: "",
      sort: { ...(v.sort || c.defaultSort) }, group: v.group || null,
      density: "comfortable", hidden: c.columns.filter((x) => x.hidden).map((x) => x.key),
      limit: STEP, selected: new Set(), collapsed: new Set(), mode: "ready",
    };
  }
  function applyView(v) {
    Object.assign(st, { view: v.id, filters: clone(v.filters), added: [], sort: { ...(v.sort || cfg.defaultSort) }, group: v.group || null, limit: STEP, collapsed: new Set() });
    st.selected.clear();
  }
  const currentView = () => cfg.views.find((v) => v.id === st.view);
  const norm = (filters) => JSON.stringify(Object.keys(filters).filter((k) => isSet(k, filters[k])).sort().map((k) => [k, Array.isArray(filters[k]) ? [...filters[k]].sort() : filters[k]]));
  function isDirty() {
    const v = currentView();
    const sort = v.sort || cfg.defaultSort;
    return norm(st.filters) !== norm(v.filters) || st.sort.key !== sort.key || st.sort.dir !== sort.dir || (st.group || null) !== (v.group || null);
  }

  // ---------- filtering ----------
  function isSet(key, val) {
    const f = filterDef(key);
    if (!f || val == null) return false;
    if (f.type === "enum") return val.length > 0;
    if (f.type === "single") return !!val;
    if (f.type === "range") return val.min != null || val.max != null;
    return false;
  }
  const active = () => cfg.filters.filter((f) => isSet(f.key, st.filters[f.key]));
  // a single status picked from a slice card: the card is pressed, and the status is a chip like any other filter,
  // so the count row always shows what narrowed the list (× on the chip releases the card)
  function cardValue() {
    if (!cfg.cardKey) return null;
    const v = st.filters[cfg.cardKey];
    return Array.isArray(v) && v.length === 1 && cfg.metrics.some((m) => m.value === v[0]) ? v[0] : null;
  }
  const chipped = () => cfg.filters.filter((f) => f.key !== cfg.dateKey && (isSet(f.key, st.filters[f.key]) || st.added.includes(f.key)));
  function passes(f, row) {
    const val = st.filters[f.key];
    const x = f.get(row);
    if (f.type === "enum") return val.includes(x);
    if (f.type === "single") return f.options.find((o) => o.value === val)?.test(x) ?? true;
    if (f.type === "range") return (val.min == null || x >= val.min) && (val.max == null || x <= val.max);
    return true;
  }
  function rowsWhere({ except, search = true } = {}) {
    // every search chip has to match, and so does whatever is still being typed
    const qs = search ? [...st.terms, st.search].map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    const fs = active().filter((f) => f.key !== except);
    return cfg.rows.filter((row) => { const text = qs.length ? cfg.search(row).toLowerCase() : ""; return qs.every((t) => text.includes(t)) && fs.every((f) => passes(f, row)); });
  }
  function sorted(rows) {
    const col = cfg.columns.find((c) => c.key === st.sort.key) || cfg.columns[0];
    const dir = st.sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.sort(a), y = col.sort(b);
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * dir;
    });
  }
  function chipText(f, val) {
    if (f.type === "enum") {
      const labels = val.map((v) => f.options.find((o) => o.value === v)?.label ?? v);
      return labels.length <= 2 ? labels.join(", ") : `${labels.length} selected`;
    }
    if (f.type === "single") return f.options.find((o) => o.value === val)?.label ?? val;
    if (f.type === "range") {
      if (val.min != null && val.max != null) return `${fmt.money0(val.min)}–${fmt.money0(val.max)}`;
      return val.min != null ? `${fmt.money0(val.min)} or more` : `Up to ${fmt.money0(val.max)}`;
    }
    return "";
  }
  const nouns = (n) => fmt.plural(n, cfg.noun[0], cfg.noun[1]);

  // ---------- URL: filters, search, sort and grouping live in the hash, so a list can be shared ----------
  function toHash() {
    const p = new URLSearchParams();
    const v = currentView();
    if (v.id !== cfg.views[0].id) p.set("view", v.id);
    for (const f of active()) {
      const val = st.filters[f.key];
      p.set(f.key, f.type === "enum" ? val.join(",") : f.type === "range" ? `${val.min ?? ""}-${val.max ?? ""}` : val);
    }
    st.terms.forEach((t) => p.append("q", t));
    const ds = v.sort || cfg.defaultSort;
    if (st.sort.key !== ds.key || st.sort.dir !== ds.dir) p.set("sort", `${st.sort.key}:${st.sort.dir}`);
    if ((st.group || null) !== (v.group || null)) p.set("group", st.group || "none");
    const hash = `#${cfg.id}${[...p].length ? `?${p.toString().replace(/%2C/g, ",").replace(/%3A/g, ":")}` : ""}`;
    // a framed copy (the published one) may refuse history changes; the list works without them
    if (location.hash !== hash) try { history.replaceState(null, "", hash); } catch {}
  }
  function fromHash(query) {
    const p = new URLSearchParams(query);
    applyView(cfg.views.find((x) => x.id === p.get("view")) || cfg.views[0]);
    for (const f of cfg.filters) {
      if (!p.has(f.key)) continue;
      const raw = p.get(f.key);
      if (f.type === "enum") st.filters[f.key] = raw.split(",").filter((x) => f.options.some((o) => o.value === x));
      else if (f.type === "single") st.filters[f.key] = f.options.some((o) => o.value === raw) ? raw : undefined;
      else if (f.type === "range") { const [a, b] = raw.split("-").map((x) => (x === "" ? null : +x)); st.filters[f.key] = { ...(a != null ? { min: a } : {}), ...(b != null ? { max: b } : {}) }; }
    }
    st.terms = p.getAll("q").filter((t) => t.trim()); st.search = "";
    if (p.has("sort")) { const [key, dir] = p.get("sort").split(":"); if (cfg.columns.some((c) => c.key === key)) st.sort = { key, dir: dir === "asc" ? "asc" : "desc" }; }
    if (p.has("group")) { const g = p.get("group"); st.group = cfg.groups.includes(g) ? g : null; }
  }

  // ---------- render ----------
  function render() {
    toHash();
    renderHeader();
    renderToolbar();
    renderSlices();
    renderBody();
    renderBulk();
    if (popFor) refreshPop();
  }

  function renderHeader() {
    // D28: the title is the menu item's label (Job list, not Jobs)
    const title = BolsterShell.label(cfg.nav) || cfg.title;
    $("#page-title").textContent = title;
    document.title = `${title} · Bolster`;
    $("#create").textContent = cfg.create;
    BolsterShell.setCurrent(cfg.nav);
    $("#cc-state").value = st.mode;
  }

  function renderToolbar() {
    $("#list-toolbar").hidden = st.mode === "empty";
    const chips = chipped().map((f) => {
      const val = st.filters[f.key];
      if (!isSet(f.key, val)) {
        return `<span class="chip"><button type="button" class="chip-main" data-filter="${f.key}" aria-haspopup="dialog" aria-expanded="false">${I.plus}${esc(f.label)}</button></span>`;
      }
      const text = chipText(f, val);
      return `<span class="chip" data-active><button type="button" class="chip-main" data-filter="${f.key}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(f.label)}: ${esc(text)}. Change filter"><span class="chip-field">${esc(f.label)}:</span><span class="chip-value">${esc(text)}</span></button><button type="button" class="chip-remove" data-remove="${f.key}" aria-label="Remove ${esc(f.label.toLowerCase())} filter">${I.x}</button></span>`;
    });
    // a search becomes a chip like any filter; click it to edit the words again
    const terms = st.terms.map((t, i) => `<span class="chip" data-active data-term><button type="button" class="chip-main" data-edit-term="${i}" aria-label="Search: ${esc(t)}. Edit"><span class="chip-field">Search:</span><span class="chip-value">“${esc(t)}”</span></button><button type="button" class="chip-remove" data-remove-term="${i}" aria-label="Remove search ${esc(t)}">${I.x}</button></span>`);
    chips.unshift(...terms);
    if (active().length || st.terms.length) chips.push(`<button type="button" class="button clear-all" data-variant="ghost" data-size="sm" data-clear-all>Clear all</button>`);
    $("#filters").innerHTML = chips.join("");
    $("#add-filter").disabled = st.mode !== "ready" || !addable().length;

    const total = cfg.rows.length;
    const n = st.mode === "ready" ? rowsWhere().length : null;
    $("#result-count").innerHTML = st.mode === "loading" ? "Loading…" : n == null ? "" :
      n === total ? nouns(total) : `<strong>${fmt.count(n)}</strong> of ${nouns(total)}`;
    // the second row shows once something narrows the list; at rest the All card already says the total
    $("#list-chips").hidden = !(chips.length || (n != null && n !== total));

    // date range: the list's own date filter, shown as a span ending today
    const df = filterDef(cfg.dateKey);
    const dv = df && st.filters[df.key];
    const long = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const ago = (n) => new Date(+TODAY - n * 864e5);
    const label = !dv ? "All time" : /^older(\d+)$/.test(dv) ? `Before ${long(ago(+dv.slice(5)))}` : `${long(ago(+dv))} – Now`;
    const dr = $("#date-range");
    dr.hidden = !df || st.mode === "empty";
    $("#date-range-label").textContent = label;
    dr.toggleAttribute("data-active", !!dv);
    if (df) dr.setAttribute("aria-label", `${df.label}: ${label}. Change`);

    // search: a bare field in the header; what's typed filters live, Enter turns it into a chip
    const input = $("#search");
    input.disabled = st.mode !== "ready";
    input.placeholder = "Search";
    input.title = cfg.searchHint;
    input.setAttribute("aria-label", `Search ${cfg.noun[1]}. ${cfg.searchHint}`);
    if (input.value !== st.search) input.value = st.search;
  }
  const addable = () => cfg.filters.filter((f) => f.key !== cfg.dateKey && !chipped().includes(f) && !(f.key === cfg.cardKey && isSet(f.key, st.filters[f.key])));

  function renderSlices() {
    const box = $("#summary");
    box.hidden = !cfg.metrics.length || st.mode === "empty" || st.mode === "error";
    if (box.hidden) return;
    const row = $("#metrics");

    if (st.mode === "loading") {
      row.style.setProperty("--_slices", cfg.metrics.length + 1);
      row.innerHTML = [...Array(cfg.metrics.length + 1)].map(() => `<div class="slice" aria-hidden="true"><span class="skeleton" style="inline-size:60%"></span><span class="skeleton" style="block-size:var(--space-6);inline-size:75%"></span></div>`).join("")
        + (cfg.insight ? `<div class="slice slice-insight" aria-hidden="true"><span class="skeleton" style="inline-size:40%"></span><span class="skeleton" style="block-size:var(--space-6);inline-size:30%"></span></div>` : "");
      return;
    }

    // cards count what the other filters let through, so each number is what a click gives you
    const scope = rowsWhere({ except: cfg.cardKey });
    const picked = cardValue();
    const none = !isSet(cfg.cardKey, st.filters[cfg.cardKey]);
    const card = (value, label, status, count, big, on, empty) =>
      `<button class="slice" type="button" data-metric="${value}" aria-pressed="${on}"${empty ? " data-empty" : ""}>
        <span class="slice-head"><span class="slice-label">${status ? `<span class="${status.mark ? "mark" : "dot"}"${status.mark ? ` data-mark="${status.mark}"` : ""} style="--_dot:${status.dot}"></span>` : ""}${esc(label)}</span>${count != null ? `<span class="slice-count">${fmt.count(count)}</span>` : ""}</span>
        <span class="slice-value">${big}</span></button>`;
    const all = card("", `All ${cfg.noun[1]}`, null, cfg.metrics[0].noCount ? null : scope.length, cfg.allCard ? cfg.allCard.big(scope) : fmt.count(scope.length), none, !scope.length);
    const cards = cfg.metrics.map((m) => {
      const slice = scope.filter((r) => filterDef(cfg.cardKey).get(r) === m.value);
      return card(m.value, m.label, cfg.statusMap?.[m.value], m.noCount ? null : slice.length, m.big(slice, scope), picked === m.value, !slice.length);
    });
    row.style.setProperty("--_slices", cfg.metrics.length + 1);
    row.toggleAttribute("data-no-insight", !cfg.insight);
    row.innerHTML = all + cards.join("") + insight(scope);
  }

  // the one card that isn't a filter: label with a definition, the value with its counts, the parts, then a second figure
  function insight(scope) {
    const x = cfg.insight;
    if (!x) return "";
    const m = x.main(scope);
    // a card with a bar always has one: with nothing to split it's an empty track, so the card keeps its shape
    const parts = m.bar?.filter(([n]) => n > 0) || [];
    const bar = !m.bar ? "" : parts.length
      ? `<div class="split-bar" role="img" aria-label="${esc(m.bar.map(([n, , what]) => `${typeof n === "number" && n % 1 ? fmt.money0(n) : fmt.count(n)} ${what}`).join(", "))}">${parts.map(([n, color]) => `<span style="flex:${n};background:${color}"></span>`).join("")}</div>`
      : `<div class="split-bar" data-empty aria-hidden="true"></div>`;
    const more = (x.more || []).map((s) => `<div class="insight-secondary"><span class="slice-label">${esc(s.label)}</span><span class="insight-second-value">${s.value(scope)}</span><span class="insight-sub">${esc(s.sub(scope))}</span></div>`).join("");
    return `<div class="slice slice-insight" role="group" aria-labelledby="insight-label">
      <div class="insight-primary">
        <span class="slice-head"><span class="slice-label" id="insight-label">${esc(x.label)}</span><button type="button" class="info-button" data-info aria-label="How ${esc(x.label.toLowerCase())} is worked out" aria-haspopup="dialog" aria-expanded="false">${I.help}</button></span>
        <span class="insight-main"${m.empty ? " data-empty" : ""}><span class="slice-value">${m.value}</span>${m.counts ? `<span class="insight-counts">${esc(m.counts)}</span>` : ""}</span>
        ${bar}
      </div>${more}</div>`;
  }

  function cols() { return cfg.columns.filter((c) => c.required || !st.hidden.includes(c.key)); }

  // ---------- explanations in the screen's own words (D27) ----------
  // {status} draws a status as its card shows it (mark or dot, then its label), looked up in this list's
  // status map first, then the others' (a customer's lifetime value counts their jobs); [Label] marks any
  // other on-screen label
  function terms(text) {
    const maps = [cfg.statusMap, ...Object.values(configs).map((c) => c.statusMap)].filter(Boolean);
    return esc(text)
      .replace(/\{([a-z-]+)\}/g, (m, k) => {
        const s = maps.find((map) => map[k])?.[k];
        if (!s) return m;
        const shape = s.mark ? `<span class="mark" data-mark="${s.mark}" style="--_dot:${s.dot}"></span>` : `<span class="dot" style="--_dot:${s.dot}"></span>`;
        return `<span class="term">${shape}${esc(s.label)}</span>`;
      })
      .replace(/\[([^\]]+)\]/g, '<span class="term">$1</span>');
  }

  // ---------- column widths come from the data (I13) ----------
  // Every column but the first is as wide as the widest thing it can ever show: each row's value across the
  // whole list (not just what's on screen), every status in the list's status map (even one no row has yet),
  // and its own header with room for the sort arrow. Measured once per list in an offscreen copy of the
  // table, so the result follows the real fonts, paddings and badges; a hand-set width is only a floor.
  // Only the first column truncates.
  const widths = {};
  function measureColumns() {
    if (widths[cfg.id]) return widths[cfg.id];
    const list = cfg.columns.filter((col) => !col.required);
    const values = (col) => {
      const rows = [...cfg.rows];
      if (col.key === cfg.cardKey && cfg.statusMap) Object.keys(cfg.statusMap).forEach((k) => rows.push({ ...cfg.rows[0], [col.key]: k }));
      return [...new Set(rows.map((x) => col.render(x)))];
    };
    const host = document.createElement("div");
    host.className = "list-panel col-measure";
    host.setAttribute("aria-hidden", "true");
    host.innerHTML = `<table class="data-table"><thead><tr>${list.map((col) => `<th${col.numeric ? " data-numeric" : ""}><button type="button" class="data-table-sort">${esc(col.label)}</button></th>`).join("")}</tr></thead>
      <tbody><tr>${list.map((col) => `<td${col.numeric ? " data-numeric" : ""}>${values(col).map((v) => `<div class="cell">${v}</div>`).join("")}</td>`).join("")}</tr></tbody></table>`;
    document.body.append(host);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const toPx = (w) => (!w ? 0 : w.endsWith("rem") ? parseFloat(w) * rem : parseFloat(w));
    const out = {};
    $$("th", host).forEach((th, i) => { out[list[i].key] = `${Math.ceil(Math.max(th.getBoundingClientRect().width, toPx(list[i].w)))}px`; });
    host.remove();
    return (widths[cfg.id] = out);
  }
  // the real fonts can land after the first measure: measure again once they have, and redraw if it changed
  document.fonts?.ready.then(() => { const before = JSON.stringify(widths[cfg?.id]); delete widths[cfg?.id]; if (cfg && JSON.stringify(measureColumns()) !== before) renderBody(); });

  function renderBody() {
    const wrap = $("#table-wrap");
    const foot = $("#list-foot");
    $("#banner").innerHTML = "";
    foot.innerHTML = "";
    CSS.highlights?.delete("search-hit");

    if (st.mode === "empty") {
      wrap.innerHTML = state(I.inbox, `No ${cfg.noun[1]} yet`, `${cfg.noun[1][0].toUpperCase() + cfg.noun[1].slice(1)} you create or import show up here, with totals and filters.`,
        `<button class="button" data-concept-action="${esc(cfg.create)}">${esc(cfg.create)}</button><button class="button" data-variant="secondary" data-concept-action="Import from a spreadsheet">Import from a spreadsheet</button>`);
      return;
    }
    if (st.mode === "error") {
      $("#banner").innerHTML = `<div class="banner" role="alert">${I.alert}<p>We couldn't load your ${cfg.noun[1]}. Check your connection, then try again.</p><button class="button" data-variant="secondary" data-size="sm" data-retry>Try again</button></div>`;
      wrap.innerHTML = `<div style="block-size:var(--space-16)"></div>`;
      return;
    }

    const c = cols();
    const W = measureColumns();
    const head = `<thead><tr><th class="data-table-select"><input type="checkbox" class="checkbox" id="select-page" aria-label="Select all shown"${st.mode === "loading" ? " disabled" : ""}></th>${c.map((col) => {
      const on = st.sort.key === col.key;
      return `<th${col.numeric ? " data-numeric" : ""}${col.m ? ` data-m="${col.m}"` : ""}${col.hideBelow ? ` data-hide-below="${col.hideBelow}"` : ""}${col.required ? " data-primary" : ""}${W[col.key] ? ` style="inline-size:${W[col.key]};--_w:${W[col.key]}"` : ""}${on ? ` aria-sort="${st.sort.dir === "asc" ? "ascending" : "descending"}"` : ""}><button type="button" class="data-table-sort" data-sort="${col.key}">${esc(col.label)}</button></th>`;
    }).join("")}<th class="row-actions"><span class="visually-hidden">Actions</span></th></tr></thead>`;

    if (st.mode === "loading") {
      const sk = Array.from({ length: 8 }, () => `<tr><td class="data-table-select"><span class="skeleton" style="inline-size:var(--space-4);block-size:var(--space-4)"></span></td>${c.map((col, i) => `<td${col.required ? " data-primary" : ""}${col.hideBelow ? ` data-hide-below="${col.hideBelow}"` : ""}${col.m ? ` data-m="${col.m}"` : ""}><span class="skeleton" style="inline-size:${i === 0 ? 70 : 50}%;${col.numeric ? "margin-inline-start:auto" : ""}"></span></td>`).join("")}<td class="row-actions"></td></tr>`).join("");
      wrap.innerHTML = `<table class="data-table" data-density="${st.density}" aria-busy="true">${head}<tbody>${sk}</tbody></table>`;
      return;
    }

    const rows = sorted(rowsWhere());
    if (!rows.length) {
      const words = [...st.terms, st.search].map((t) => t.trim()).filter(Boolean);
      const what = [...active().map((f) => `${f.label}: ${chipText(f, st.filters[f.key])}`), ...words.map((t) => `search “${t}”`)].join(", ");
      wrap.innerHTML = state(I.search, `No ${cfg.noun[1]} match`, `Nothing matches ${esc(what)}. Remove a filter or try a different search.`,
        `${active().length ? `<button class="button" data-variant="secondary" data-clear-all>Clear all filters</button>` : ""}${words.length ? `<button class="button" data-variant="secondary" data-clear-search>Clear search</button>` : ""}`);
      return;
    }

    const rowHtml = (x) => {
      const name = cfg.search(x).split(" ").slice(0, 4).join(" ");
      return `<tr data-id="${x.id}"${st.selected.has(x.id) ? " data-selected" : ""}${openId === x.id ? ' data-open aria-current="true"' : ""}><td class="data-table-select"><input type="checkbox" class="checkbox" data-select="${x.id}" aria-label="Select ${esc(name)}"${st.selected.has(x.id) ? " checked" : ""}></td>${c.map((col) => `<td data-key="${col.key}"${col.required ? " data-primary" : ""}${col.numeric ? " data-numeric" : ""}${col.hideBelow ? ` data-hide-below="${col.hideBelow}"` : ""}${col.m ? ` data-m="${col.m}"` : ""}><div class="cell">${col.render(x)}</div></td>`).join("")}<td class="row-actions"><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only data-row-menu="${x.id}" aria-label="Actions for ${esc(name)}" aria-haspopup="menu" aria-expanded="false">${I.dots}</button></td></tr>`;
    };

    let body = "";
    let shownRows;
    if (st.group) {
      // grouped lists show everything: the groups are the paging
      const g = filterDef(st.group);
      const buckets = new Map(g.options.map((o) => [o.value, []]));
      rows.forEach((x) => { const k = g.get(x); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(x); });
      const money = c.find((col) => col.total && col.totalFmt);
      shownRows = [];
      for (const [k, list] of buckets) {
        if (!list.length) continue;
        const o = g.options.find((x) => x.value === k);
        const open = !st.collapsed.has(k);
        body += `<tr class="group-row"><td colspan="${c.length + 2}"><div class="group-head"><button type="button" class="group-toggle" data-group="${esc(k)}" aria-expanded="${open}">${I.chev}${o?.html || esc(o?.label ?? k)}</button><span class="group-meta">${nouns(list.length)}${money ? ` · ${money.totalFmt(list.reduce((s, x) => s + money.sort(x), 0))}` : ""}</span></div></td></tr>`;
        if (open) { body += list.map(rowHtml).join(""); shownRows.push(...list); }
      }
    } else {
      shownRows = rows.slice(0, st.limit);
      body = shownRows.map(rowHtml).join("");
      // the footer shows the range and loads more; the count itself lives by the filters
      if (shownRows.length < rows.length) {
        const next = Math.min(STEP, rows.length - shownRows.length);
        foot.innerHTML = `<span class="list-foot-range">Showing 1–${fmt.count(shownRows.length)} of ${fmt.count(rows.length)}</span><button type="button" class="button" data-variant="secondary" data-size="sm" data-load-more>Load ${fmt.count(next)} more</button>`;
      }
    }

    const caption = `<caption class="visually-hidden">${esc($("#page-title").textContent)}, sorted by ${esc((cfg.columns.find((x) => x.key === st.sort.key) || c[0]).label.toLowerCase())}, ${st.sort.dir === "asc" ? "ascending" : "descending"}</caption>`;
    wrap.innerHTML = `<table class="data-table" data-density="${st.density}">${caption}${head}<tbody>${body}</tbody></table>`;
    syncSelectPage(shownRows.map((x) => x.id));
    markHits();
  }
  // search hits: every search chip and the words being typed are marked where they matched, in the cells the
  // search reads (the record's title and the line under it, plus the columns a config lists in searchIn), not
  // in the owner or anything else a word might happen to appear in. Custom Highlight API: no markup goes in,
  // so measured widths, truncation and the row's link stay as they are.
  function markHits() {
    if (!window.Highlight || !CSS.highlights) return;
    const words = [...st.terms, st.search].map((t) => t.trim().toLowerCase()).filter(Boolean);
    const ranges = [];
    if (words.length) {
      const cells = ["td[data-primary]", ...(cfg.searchIn || []).map((k) => `td[data-key="${k}"]`)].join(", ");
      for (const td of $("#table-wrap").querySelectorAll(`tbody :is(${cells})`)) {
        const walk = document.createTreeWalker(td, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest(".avatar, .visually-hidden") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
        for (let n; (n = walk.nextNode()); ) {
          const text = n.data.toLowerCase();
          for (const w of words) for (let i = text.indexOf(w); i !== -1; i = text.indexOf(w, i + w.length)) {
            const r = new Range(); r.setStart(n, i); r.setEnd(n, i + w.length); ranges.push(r);
          }
        }
      }
    }
    CSS.highlights.set("search-hit", new Highlight(...ranges));
  }
  function syncSelectPage(ids) {
    const all = $("#select-page");
    if (!all) return;
    if (ids) all.dataset.ids = ids.join(",");
    const list = all.dataset.ids ? all.dataset.ids.split(",") : [];
    const n = list.filter((id) => st.selected.has(id)).length;
    all.checked = n > 0 && n === list.length;
    all.indeterminate = n > 0 && n < list.length;
  }

  const state = (icon, title, text, actions) =>
    `<div class="state"><span class="state-icon">${icon}</span><h3>${title}</h3><p>${text}</p><div class="state-actions">${actions}</div></div>`;

  // ---------- floating bar: count first, select all, actions, the risky one last, clear ----------
  // a menu row that opens its own menu (drills in on phones)
  const sub = (name, label, icon, value, items, cls = "") => `<div class="submenu-row${cls}"><button type="button" class="menu-item submenu-trigger" role="menuitem" data-sub="${name}" data-focus-key="sub-${name}" aria-haspopup="menu" aria-expanded="false" aria-controls="pop-sub-${name}">${mi(icon)}<span class="submenu-label">${label}</span><span class="submenu-value">${esc(value)}</span>${I.chevR}</button><div class="pop submenu" id="pop-sub-${name}" popover role="menu" aria-label="${label}"><button type="button" class="menu-item submenu-back" data-sub-back="${name}">${I.chevL}<span class="submenu-label">${label}</span></button>${items}</div></div>`;
  const risky = (a) => /^(archive|delete)/i.test(a);
  // red is for what can't be undone: Delete. Archive still confirms and sits apart, but isn't red
  const destructive = (a) => /^delete/i.test(a);
  const selectedRows = () => cfg.rows.filter((r) => st.selected.has(r.id));
  // a list of actions as menu items: plain ones, then the menus as labelled sections, then the risky ones in
  // red after a rule. In the bulk menus the risky ones confirm and the rest name what's selected.
  function actionItems(list, { bulk = false, peek, nested = false } = {}) {
    const n = st.selected.size, what = n === 1 ? `1 ${cfg.noun[0]}` : `${fmt.count(n)} ${cfg.noun[1]}`;
    const item = (a) => `<button type="button" class="menu-item" role="menuitem"${destructive(a) ? ' data-tone="danger"' : ""} ${a === "Open" ? `data-peek="${peek}"` : risky(a) && bulk ? `data-confirm="${esc(a)}"` : `data-concept-action="${esc(a)}${bulk ? ` ${what}` : ""}"`}>${mi(actionIcons[a])}${esc(a)}</button>`;
    const sectionItems = (g) => g.items.map((i) => g.current === undefined ? item(i)
      : `<button type="button" class="menu-item" role="menuitemradio" aria-checked="${i === g.current}" data-concept-action="${esc(g.label)} to ${esc(i.toLowerCase())}${bulk ? ` for ${what}` : ""}"><span class="menu-icon"></span>${esc(i)}${i === g.current ? I.check : ""}</button>`).join("");
    const plain = list.filter((a) => typeof a === "string" && !risky(a));
    const groups = list.filter((a) => typeof a !== "string");
    const danger = list.filter((a) => typeof a === "string" && risky(a));
    // nested (row menu, More): each menu is a submenu row, as in Bolster, with the current status as its value
    if (nested) return [plain.map(item).join("") + groups.map((g) => sub(`act-${g.icon}`, esc(g.label), g.icon, g.current || "", sectionItems(g))).join(""), danger.map(item).join("")].filter(Boolean).join("<hr>");
    return [plain.map(item).join(""), ...groups.map((g) => `<div class="pop-section">${esc(g.label)}</div>${sectionItems(g)}`), danger.map(item).join("")].filter(Boolean).join("<hr>");
  }
  function renderBulk() {
    const bar = $("#bulk-bar");
    const n = st.selected.size;
    const on = n > 0 && st.mode === "ready";
    bar.hidden = !on;
    document.querySelector(".list-page").toggleAttribute("data-selecting", on);
    document.body.toggleAttribute("data-selecting", on);
    if (!on) { bar.innerHTML = ""; return; }
    const matching = rowsWhere().length;
    const what = n === 1 ? `1 ${cfg.noun[0]}` : `${fmt.count(n)} ${cfg.noun[1]}`;
    bar.setAttribute("aria-label", `Bulk actions for ${n} selected`);
    let acts;
    if (cfg.actionsFor) {
      // actions that depend on what's selected; menus (Download, Change status, More) open from the bar
      const { bar, more } = cfg.actionsFor(selectedRows());
      const btn = (a) => `<button type="button" class="button" data-variant="ghost" data-size="sm" data-concept-action="${esc(a)} ${what}">${esc(a)}</button>`;
      const menu = (key, label) => `<button type="button" class="button" data-variant="ghost" data-size="sm" data-bulk-menu="${key}" aria-haspopup="menu" aria-expanded="false">${esc(label)}${I.chev}</button>`;
      const danger = bar.filter((a) => typeof a === "string" && risky(a));
      acts = bar.map((a, i) => (typeof a !== "string" ? menu(i, a.label) : risky(a) ? "" : btn(a))).join("")
        + (more.length ? menu("more", "More") : "")
        + (danger.length ? `<span class="floating-bar-sep" aria-hidden="true"></span>${danger.map((a) => `<button type="button" class="button" data-variant="ghost" data-size="sm"${destructive(a) ? ' data-tone="danger"' : ""} data-confirm="${esc(a)}">${esc(a)}</button>`).join("")}` : "");
    } else {
      acts = cfg.bulk.map((a) => risky(a)
        ? `<span class="floating-bar-sep" aria-hidden="true"></span><button type="button" class="button" data-variant="ghost" data-size="sm"${destructive(a) ? ' data-tone="danger"' : ""} data-confirm="${esc(a)}">${esc(a)}</button>`
        : `<button type="button" class="button" data-variant="ghost" data-size="sm" data-concept-action="${esc(a)} ${what}">${esc(a)}</button>`).join("");
    }
    bar.innerHTML = `<span class="floating-bar-count" aria-live="polite">${fmt.count(n)} selected</span>${n < matching ? `<button type="button" class="floating-bar-link" data-select-matching>Select all ${fmt.count(matching)}</button>` : `<button type="button" class="floating-bar-link" data-clear-selection>Unselect all</button>`}<span class="floating-bar-sep" aria-hidden="true"></span><span class="floating-bar-actions">${acts}</span><button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Clear selection" data-clear-selection>${I.xl}</button>`;
  }
  function openConfirm(action) {
    const n = st.selected.size;
    const what = n === 1 ? `1 ${cfg.noun[0]}` : `${fmt.count(n)} ${cfg.noun[1]}`;
    $("#confirm-title").textContent = `${action} ${what}?`;
    $("#confirm-text").textContent = /^delete/i.test(action)
      ? `This can’t be undone.`
      : `They leave every list and view. You can bring them back from Archived for 30 days.`;
    // Delete: the red button, named for the outcome, beside “Keep jobs”, and focus starts on keeping them,
    // so Enter never destroys. Archive can be undone, so it's the primary button and starts focused
    const del = destructive(action), go = $("#confirm-go"), keep = $("#confirm [data-close]");
    go.dataset.variant = del ? "danger" : "primary";
    go.textContent = `${action} ${what}`;
    go.dataset.action = `${action} ${what}`;
    keep.textContent = del ? `Keep ${n === 1 ? cfg.noun[0] : cfg.noun[1]}` : "Cancel";
    $("#confirm").showModal();
    (del ? keep : go).focus();
  }

  // ---------- shared popover ----------
  const pop = $("#pop");
  // phones: every menu and filter popover is a bottom sheet; nested menus open inside it
  const sheetMQ = matchMedia("(max-width: 767px)");
  const sheet = () => sheetMQ.matches;
  let popFor = null;
  let lastClose = { id: null, t: 0 };

  function anchorFor(p) {
    if (p.kind === "filter") return p.key === cfg.dateKey ? $("#date-range") : $(`[data-filter="${p.key}"]`) || $("#add-filter");
    if (p.kind === "add") return $("#add-filter");
    if (p.kind === "view") return $("#view-button");
    if (p.kind === "display") return $("#view-options");
    if (p.kind === "info") return $("[data-info]");
    if (p.kind === "row") return p.from || $(`[data-row-menu="${p.key}"]`);
    if (p.kind === "bulk") return $(`[data-bulk-menu="${p.key}"]`) || p.from;
    return null;
  }
  function openPop(kind, key, from) {
    const id = `${kind}:${key ?? ""}${from?.closest(".detail") ? ":detail" : ""}`;
    if (lastClose.id === id && performance.now() - lastClose.t < 250) return; // same trigger: let it close
    popFor = { kind, key, id, from };
    delete pop.dataset.drill;
    pop.setAttribute("role", kind === "view" || kind === "row" || kind === "bulk" || kind === "add" || kind === "display" ? "menu" : "dialog");
    pop.setAttribute("aria-label", kind === "filter" ? `Filter by ${filterDef(key).label.toLowerCase()}` : kind === "view" ? "Views" : kind === "display" ? "Display settings" : kind === "add" ? "Add a filter" : kind === "info" ? cfg.insight.label : kind === "bulk" ? "Actions for the selection" : "Row actions");
    fillPop();
    pop.showPopover();
    place();
    if (kind !== "info") ($$("input:checked, input, [role^=menuitem], button", pop).find((el) => el.checkVisibility()) || pop).focus({ preventScroll: true });
  }
  function place() {
    const a = anchorFor(popFor);
    $$("[aria-expanded='true']").forEach((el) => { if (el !== a) el.setAttribute("aria-expanded", "false"); });
    $$(".chip[data-open]").forEach((el) => el.removeAttribute("data-open"));
    if (!a) return;
    a.setAttribute("aria-expanded", "true");
    a.closest(".chip")?.setAttribute("data-open", "");
    if (sheet()) { pop.style.left = pop.style.top = pop.style.inlineSize = ""; return; }
    const r = a.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const alignEnd = popFor.kind === "row" || popFor.kind === "display" || popFor.kind === "info" || (popFor.kind === "filter" && popFor.key === cfg.dateKey);
    let left = alignEnd ? r.right - w : r.left;
    left = Math.max(12, Math.min(left, innerWidth - w - 12));
    let top = r.bottom + 4;
    if (top + h > innerHeight - 12 && r.top - h - 4 > 12) top = r.top - h - 4;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }
  function refreshPop() {
    if (!pop.matches(":popover-open")) return;
    const focusSel = document.activeElement && pop.contains(document.activeElement) && document.activeElement.dataset.focusKey;
    const subOpen = openSubName();
    fillPop();
    place();
    if (subOpen) openSub(subOpen);
    if (focusSel) pop.querySelector(`[data-focus-key="${focusSel}"]`)?.focus({ preventScroll: true });
  }
  // nested menus: popovers inside the display menu, so opening one keeps the menu open. Each sits
  // beside the menu, on the side with room, its first item level with its row.
  const subOf = (name) => $(`#pop-sub-${name}`);
  const triggerOf = (name) => $(`[data-sub="${name}"]`);
  const openSubName = () => $(".submenu:popover-open", pop)?.id.replace("pop-sub-", "") || null;
  function placeSub() {
    const name = openSubName();
    if (!name) return;
    const sub = subOf(name), tr = triggerOf(name);
    const m = pop.getBoundingClientRect(), r = tr.getBoundingClientRect(), w = sub.offsetWidth, h = sub.offsetHeight;
    const gap = 4, pad = parseFloat(getComputedStyle(sub).paddingBlockStart) || 0;
    let left = m.right + gap + w <= innerWidth - 12 ? m.right + gap : m.left - gap - w >= 12 ? m.left - gap - w : null;
    let top = r.top - pad;
    if (left == null) { // phones: no room beside it, so below the row, or above it near the bottom
      left = Math.max(12, r.right - w);
      top = r.bottom + gap + h <= innerHeight - 12 ? r.bottom + gap : r.top - gap - h;
    }
    top = Math.max(12, Math.min(top, innerHeight - h - 12));
    sub.style.left = `${left}px`;
    sub.style.top = `${top}px`;
  }
  function openSub(name, { focus = false } = {}) {
    const sub = subOf(name);
    if (!sub) return;
    if (sheet()) { // in the sheet: drill in, with a back row on top
      pop.dataset.drill = name;
      pop.scrollTop = 0;
      if (focus) ($("[aria-checked=true]", sub) || $("[role^=menuitem]", sub))?.focus({ preventScroll: true });
      return;
    }
    const other = openSubName();
    if (other && other !== name) subOf(other).hidePopover();
    if (!sub.matches(":popover-open")) sub.showPopover();
    placeSub();
    if (focus) ($("[aria-checked=true]", sub) || $("[role^=menuitem]", sub))?.focus({ preventScroll: true });
  }
  function closeSub(name) {
    if (pop.dataset.drill === name) delete pop.dataset.drill;
    const sub = subOf(name);
    if (sub?.matches(":popover-open")) sub.hidePopover();
    triggerOf(name)?.focus({ preventScroll: true });
  }
  pop.addEventListener("toggle", (e) => {
    if (!e.target.matches?.(".submenu") || !e.target.isConnected) return;
    const open = e.newState === "open", tr = triggerOf(e.target.id.replace("pop-sub-", ""));
    tr?.setAttribute("aria-expanded", open);
    if (!open && e.target.contains(document.activeElement)) tr?.focus({ preventScroll: true });
  }, true);
  pop.addEventListener("scroll", placeSub, { passive: true });
  // pointer: hovering a row opens its menu, hovering a row without one closes it
  let subTimer;
  pop.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse" || e.target.closest(".submenu")) return clearTimeout(subTimer);
    const name = e.target.closest("[data-sub]")?.dataset.sub || null;
    if (name === openSubName()) return clearTimeout(subTimer);
    clearTimeout(subTimer);
    subTimer = setTimeout(() => (name ? openSub(name) : openSubName() && subOf(openSubName()).hidePopover()), name ? 120 : 200);
  });

  pop.addEventListener("beforetoggle", (e) => {
    if (e.target !== pop || e.newState !== "closed" || !popFor) return;
    const p = popFor;
    let a = anchorFor(p);
    lastClose = { id: p.id, t: performance.now() };
    a?.setAttribute("aria-expanded", "false");
    a?.closest(".chip")?.removeAttribute("data-open");
    // a field picked from "Add filter" but left without a value goes away again
    const dropped = p.kind === "filter" && st.added.includes(p.key) && !isSet(p.key, st.filters[p.key]);
    if (dropped) { st.added = st.added.filter((k) => k !== p.key); a = $("#add-filter"); }
    if (pop.contains(document.activeElement) || document.activeElement === document.body) a?.focus({ preventScroll: true });
    popFor = null;
    if (dropped) setTimeout(() => { renderToolbar(); $("#add-filter").focus({ preventScroll: true }); });
  });
  addEventListener("resize", () => popFor && (place(), placeSub()));
  sheetMQ.addEventListener("change", () => { if (pop.matches(":popover-open")) pop.hidePopover(); });
  addEventListener("scroll", () => popFor && (place(), placeSub()), { passive: true });

  function fillPop() {
    const p = popFor;
    if (p.kind === "filter") {
      const f = filterDef(p.key);
      const val = st.filters[f.key];
      const set = isSet(f.key, val);
      const head = `<div class="pop-head"><h3>${esc(f.label)}</h3>${set ? `<button type="button" class="button" data-variant="ghost" data-size="sm" data-remove="${f.key}">Clear</button>` : ""}</div>`;
      if (f.type === "enum") {
        const base = rowsWhere({ except: f.key });
        pop.innerHTML = `${head}<div class="pop-body" role="group" aria-label="${esc(f.label)}">${f.options.map((o) => {
          const n = base.filter((x) => f.get(x) === o.value).length;
          return `<label class="option"><input type="checkbox" class="checkbox" data-opt="${esc(o.value)}" data-focus-key="${esc(o.value)}"${val?.includes(o.value) ? " checked" : ""}><span class="option-label">${o.html || esc(o.label)}</span><span class="option-count">${n}</span></label>`;
        }).join("")}</div>`;
      } else if (f.type === "single") {
        const base = rowsWhere({ except: f.key });
        pop.innerHTML = `${head}<div class="pop-body" role="radiogroup" aria-label="${esc(f.label)}"><label class="option"><input type="radio" class="radio" name="pop-single" data-single="" data-focus-key="any"${!val ? " checked" : ""}><span class="option-label">Any time</span><span class="option-count">${base.length}</span></label>${f.options.map((o) => `<label class="option"><input type="radio" class="radio" name="pop-single" data-single="${o.value}" data-focus-key="${o.value}"${val === o.value ? " checked" : ""}><span class="option-label">${esc(o.label)}</span><span class="option-count">${base.filter((x) => o.test(f.get(x))).length}</span></label>`).join("")}</div>`;
      } else if (f.type === "range") {
        const v = val || {};
        const box = (id, label, x) => `<div class="field" data-size="sm"><label class="field-label" for="${id}">${label}</label><div class="input-group"><span class="input-adornment">$</span><input class="input" id="${id}" data-numeric inputmode="decimal" placeholder="Any" value="${x ?? ""}"></div></div>`;
        pop.innerHTML = `${head}<form data-range><div class="range">${box("range-min", "Minimum", v.min)}${box("range-max", "Maximum", v.max)}</div><div class="pop-foot"><button class="button" data-size="sm">Apply</button></div></form>`;
      }
    } else if (p.kind === "add") {
      pop.innerHTML = `<div class="pop-body" style="padding-block-start:var(--space-2)"><div class="pop-section">Filter by</div>${addable().map((f) => `<button type="button" class="menu-item" role="menuitem" data-add="${f.key}">${mi(attrIcons[f.key])}${esc(f.label)}</button>`).join("")}</div>`;
    } else if (p.kind === "info") {
      pop.innerHTML = `<div class="pop-note"><h3>${esc(cfg.insight.label)}</h3><p>${terms(cfg.insight.info)}</p></div>`;
    } else if (p.kind === "view") {
      const dirty = isDirty();
      pop.innerHTML = `<div class="pop-body" style="padding-block-start:var(--space-2)"><div class="pop-section">Views</div>${cfg.views.map((v) => `<button type="button" class="menu-item" role="menuitemradio" aria-checked="${v.id === st.view}" data-view="${v.id}">${mi(v.icon)}${esc(v.label)}</button>`).join("")}<hr><button type="button" class="menu-item" role="menuitem" data-concept-action="Save as a new view">${mi("save")}Save as new view…</button>${dirty ? `<button type="button" class="menu-item" role="menuitem" data-concept-action="Update “${esc(currentView().label)}”">${mi("refresh-cw")}Update “${esc(currentView().label)}”</button><button type="button" class="menu-item" role="menuitem" data-reset-view>${mi("undo")}Discard changes</button>` : ""}</div>`;
    } else if (p.kind === "display") {
      // every setting is a row with its current value; each opens a nested menu, a check by what's chosen
      const opt = cfg.columns.filter((c) => !c.required);
      const shown = opt.filter((c) => !st.hidden.includes(c.key)).length;
      const item = (role, on, attrs, label, icon) => `<button type="button" class="menu-item" role="${role}" aria-checked="${on}" ${attrs}>${mi(icon)}<span class="submenu-label">${esc(label)}</span>${on ? I.check : ""}</button>`;
      const sortItems = cfg.columns.map((c) => item("menuitemradio", st.sort.key === c.key, `data-sort-pick="${c.key}" data-focus-key="s-${c.key}"`, c.label, attrIcons[c.key])).join("")
        + "<hr>" + [["asc", "Ascending", "sort-asc"], ["desc", "Descending", "sort"]].map(([d, l, i]) => item("menuitemradio", st.sort.dir === d, `data-dir-pick="${d}" data-focus-key="dir-${d}"`, l, i)).join("");
      const groupItems = [["", "None"], ...cfg.groups.map((k) => [k, filterDef(k).label])].map(([v, l]) => item("menuitemradio", (st.group || "") === v, `data-group-pick="${v}" data-focus-key="g-${v || "none"}"`, l, v ? attrIcons[v] : "list")).join("");
      const densityItems = [["comfortable", "Comfortable"], ["compact", "Compact"]].map(([v, l]) => item("menuitemradio", st.density === v, `data-density-pick="${v}" data-focus-key="d-${v}"`, l)).join("");
      const colItems = opt.map((c) => item("menuitemcheckbox", !st.hidden.includes(c.key), `data-col-toggle="${c.key}" data-focus-key="c-${c.key}"`, c.label, attrIcons[c.key])).join("");
      pop.innerHTML = `<div class="pop-body" style="padding-block-start:var(--space-2)">
        ${sub("sort", "Sort by", "sort", cfg.columns.find((c) => c.key === st.sort.key)?.label ?? "", sortItems, " pop-phone-only")}
        ${sub("group", "Group by", "layers", st.group ? filterDef(st.group).label : "None", groupItems)}
        ${sub("density", "Row height", "line-height", st.density === "compact" ? "Compact" : "Comfortable", densityItems)}
        ${sub("cols", "Columns", "columns-3", shown === opt.length ? "All" : `${shown} of ${opt.length}`, colItems)}
      </div>`;
    } else if (p.kind === "bulk") {
      const { bar, more } = cfg.actionsFor(selectedRows());
      const g = p.key === "more" ? null : bar[+p.key];
      pop.innerHTML = `<div class="pop-body" style="padding-block-start:var(--space-2)">${g ? actionItems([{ ...g }], { bulk: true }).replace(/^<div class="pop-section">[^<]*<\/div>/, "") : actionItems(more, { bulk: true, nested: true })}</div>`;
    } else if (p.kind === "row" && cfg.actionsFor) {
      // the row's menu: everything Bolster offers for this job's status; from the record, minus its own buttons
      const x = cfg.rows.find((r) => r.id === p.key);
      const { bar, more } = cfg.actionsFor([x]);
      const own = p.from?.closest(".detail") ? ["Open", ...$$(".detail-actions [data-concept-action]:not([hidden])", p.from.closest(".detail")).map((b) => b.dataset.conceptAction)] : [];
      const list = ["Open", ...bar, ...more].filter((a) => !own.includes(a));
      pop.innerHTML = `<div class="pop-body" style="padding-block-start:var(--space-2)">${actionItems(list, { peek: p.key, nested: true })}</div>`;
    } else if (p.kind === "row") {
      // from the record's More, "Open" (and the catalog's "Edit") would only reopen it
      const folded = p.from?.closest(".detail") ? $$(".detail-actions [data-concept-action][hidden]", p.from.closest(".detail")).map((b) => b.dataset.conceptAction) : [];
      const acts = [...folded, ...cfg.rowActions.filter((a) => !folded.includes(a) && !(p.from?.closest(".detail") && (a === "Open" || a === "Edit")))];
      pop.innerHTML = `<div class="pop-body" style="padding-block-start:var(--space-2)">${acts.map((a, i) => `${i === acts.length - 1 ? "<hr>" : ""}<button type="button" class="menu-item" role="menuitem"${i === acts.length - 1 ? ' data-tone="danger"' : ""} ${a === "Open" || a === "Edit" ? `data-peek="${p.key}"` : `data-concept-action="${esc(a)}"`}>${mi(actionIcons[a])}${esc(a)}</button>`).join("")}</div>`;
    }
    pop.style.inlineSize = p.kind === "row" || p.kind === "bulk" || p.kind === "add" ? "auto" : p.kind === "info" ? "16rem" : "";
  }

  // ---------- updates ----------
  function set(fn, { keepSelection = false } = {}) {
    fn();
    st.limit = STEP;
    if (!keepSelection) st.selected.clear();
    render();
  }
  const setFilter = (key, val) => set(() => { st.filters[key] = val; if (!isSet(key, val)) delete st.filters[key]; });

  function loadMore({ focus = false } = {}) {
    const before = st.limit;
    st.limit += STEP;
    renderBody();
    if (focus) $$("#table-wrap tbody tr")[before]?.querySelector(".data-table-link")?.focus();
  }

  function toast(message) {
    const t = document.createElement("div");
    t.className = "toast";
    t.dataset.tone = "info";
    t.setAttribute("role", "status");
    t.innerHTML = `<span class="toast-message"></span><button class="toast-close" aria-label="Dismiss">×</button>`;
    t.querySelector(".toast-message").textContent = message;
    t.querySelector(".toast-close").onclick = () => t.remove();
    $(".toast-region").append(t);
    setTimeout(() => t.remove(), 4000);
  }

  // ---------- the record: beside the list on wide screens, a sheet on narrower ones ----------
  // As in Mercury: heading and close, status, the amount, a timeline (oldest first, the next step
  // hollow at the end), two actions and More, the details, then the document
  const splitMQ = matchMedia("(min-width: 1280px)");
  let openId = null;
  const money = (v) => { const i = v.lastIndexOf("."); return i < 0 ? esc(v) : `${esc(v.slice(0, i))}<span class="detail-cents">${esc(v.slice(i))}</span>`; };
  function timelineHtml(ev) {
    const past = ev.filter((e) => !e.next), next = ev.filter((e) => e.next);
    // long histories fold: the first event, "+ n more events", then the last two
    const fold = past.length > 4 ? past.length - 3 : 0;
    const dot = (e) => e.mark ? `<span class="tl-dot mark" data-mark="${e.mark}" style="--_dot:${e.color}"></span>` : `<span class="tl-dot"${e.tone ? ` data-tone="${e.tone}"` : ""}></span>`;
    const li = (e, i, all) => `<li${e.next ? " data-next" : ""}${e.fold ? " data-fold hidden" : ""} data-line="${i === all.length - 1 ? "none" : all[i + 1].next ? "dashed" : "solid"}">${e.next ? `<span class="tl-dot" data-next></span>` : dot(e)}<div><p class="tl-what">${esc(e.what)}</p><p class="tl-meta">${esc(e.meta)}</p></div></li>`;
    const items = [...past.map((e, i) => (fold && i >= 1 && i < 1 + fold ? { ...e, fold: true } : e)), ...next];
    let html = items.map(li).join("");
    if (fold) {
      const at = html.indexOf("<li", html.indexOf("</li>"));
      html = html.slice(0, at) + `<li class="tl-more" data-line="dotted"><button type="button" class="link-button" data-tl-more>+ ${fold} more ${fold === 1 ? "event" : "events"}${I.chevR}</button></li>` + html.slice(at);
    }
    return `<ol class="timeline" aria-label="Activity">${html}</ol>`;
  }
  function detailHtml(id) {
    const x = cfg.rows.find((r) => r.id === id);
    const p = cfg.peek(x);
    return `<header class="detail-head">
        <h2 id="detail-title" tabindex="-1">${esc(p.heading)}</h2>
        <button type="button" class="button" data-variant="ghost" data-size="sm" data-concept-action="${esc(p.open)}">${esc(p.open)}${ic("m-external", 12)}</button>
        <span class="detail-sep" aria-hidden="true"></span>
        <button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Close" data-detail-close>${I.xl}</button>
      </header>
      <div class="detail-scroll">
        <div class="detail-section detail-hero">
          ${p.badge}
          <p class="detail-amount${p.amount ? "" : " is-empty"}">${p.amount ? money(p.amount) : esc(p.empty)}</p>
          <p class="detail-sub">${esc(p.sub)}</p>
          ${timelineHtml(p.timeline)}
          <div class="detail-actions">${p.actions.map(([l, i]) => `<button type="button" class="button" data-variant="secondary" data-concept-action="${esc(l)}">${ic(`m-${i}`, 14)}${esc(l)}</button>`).join("")}<button type="button" class="button" data-variant="secondary" data-row-menu="${x.id}" aria-haspopup="menu" aria-expanded="false">More${I.chev}</button></div>
        </div>
        <dl class="detail-section detail-fields">${p.fields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>
        ${p.doc ? `<div class="detail-section detail-doc"><div class="detail-doc-head"><span>${esc(p.doc.label)}</span><button type="button" class="link-button" data-concept-action="${esc(p.doc.view)}">${esc(p.doc.view)}${ic("m-external", 12)}</button></div><button type="button" class="detail-file" data-concept-action="Download ${esc(p.doc.name)}">${ic("m-file", 14)}<span>${esc(p.doc.name)}</span>${ic("m-download", 14)}</button></div>` : ""}
      </div>`;
  }
  const markRow = () => $$("#table-wrap tbody tr[data-id]").forEach((tr) => { const on = tr.dataset.id === openId; tr.toggleAttribute("data-open", on); on ? tr.setAttribute("aria-current", "true") : tr.removeAttribute("aria-current"); });
  // the record's actions: both plus More if they fit on one line, else the first plus More (the second
  // then shows in More, which lists whatever isn't on the card)
  function fitActions(d) {
    const row = $(".detail-actions", d);
    if (!row) return;
    const acts = $$("[data-concept-action]", row);
    acts.forEach((b) => (b.hidden = false));
    if (row.scrollWidth > row.clientWidth + 1) acts.slice(1).forEach((b) => (b.hidden = true));
  }
  const refit = new ResizeObserver((es) => es.forEach((e) => fitActions(e.target)));
  function openPeek(id) {
    if (!cfg.rows.some((r) => r.id === id)) return;
    if (pop.matches(":popover-open")) pop.hidePopover();
    openId = id;
    markRow();
    if (splitMQ.matches) {
      if ($("#peek").open) { $("#peek").close(); $("#peek").innerHTML = ""; }
      const d = $("#detail");
      d.innerHTML = detailHtml(id);
      d.hidden = false;
      d.scrollTop = 0;
      $("#list-split").toggleAttribute("data-open", true);
      // measured once the split view is open, so the card has its width
      fitActions(d); refit.observe(d);
      $("#detail-title", d).focus({ preventScroll: true });
    } else {
      $("#detail").hidden = true;
      $("#detail").innerHTML = "";
      $("#list-split").removeAttribute("data-open");
      const d = $("#peek");
      d.innerHTML = detailHtml(id);
      if (!d.open) d.showModal();
      fitActions(d); refit.observe(d);
      $("#detail-title", d).focus();
    }
  }
  function closeDetail({ focus = true } = {}) {
    const id = openId;
    openId = null;
    markRow();
    if ($("#peek").open) $("#peek").close();
    const d = $("#detail");
    d.hidden = true;
    d.innerHTML = "";
    $("#list-split").removeAttribute("data-open");
    if (focus && id) $(`.data-table-link[data-peek="${id}"]`)?.focus();
  }
  // Escape on the sheet: back to the row it came from (I11)
  $("#peek").addEventListener("close", () => { if (!splitMQ.matches && openId) { const id = openId; openId = null; markRow(); $(`.data-table-link[data-peek="${id}"]`)?.focus(); } });
  // crossing the breakpoint moves an open record between the side and the sheet
  splitMQ.addEventListener("change", () => { if (openId) openPeek(openId); });
  $("#detail").addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.matches(":popover-open")) { e.preventDefault(); closeDetail(); } });

  // search: the typed words become a chip; one chip per search, and every chip has to match
  function commitSearch() {
    const t = st.search.trim();
    if (!t) return false;
    set(() => { if (!st.terms.some((x) => x.toLowerCase() === t.toLowerCase())) st.terms.push(t); st.search = ""; });
    return true;
  }

  BolsterShell.mount({
    current: "job-list",
    links: Object.fromEntries(Object.values(configs).map((c) => [c.nav, `#${c.id}`])),
  });

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const t = e.target;
    const q = (sel) => t.closest(sel);
    let el;
    if ((el = q("[data-metric]"))) {
      const v = el.dataset.metric;
      setFilter(cfg.cardKey, !v || cardValue() === v ? [] : [v]);
      $(`[data-metric="${v}"]`)?.focus({ preventScroll: true });
      return;
    }
    // a click always opens (hover may already have); clicking anywhere else closes it
    if ((el = q("[data-sub-back]"))) return closeSub(el.dataset.subBack);
    if ((el = q("[data-sub]"))) return openSub(el.dataset.sub, { focus: e.detail === 0 });
    if ((el = q("[data-group-pick]"))) { const v = el.dataset.groupPick || null; closeSub("group"); return set(() => { st.group = v; st.collapsed = new Set(); }, { keepSelection: true }); }
    if ((el = q("[data-sort-pick]"))) { const key = el.dataset.sortPick; closeSub("sort"); return set(() => { st.sort = { key, dir: st.sort.dir }; }, { keepSelection: true }); }
    if ((el = q("[data-dir-pick]"))) { const dir = el.dataset.dirPick; closeSub("sort"); return set(() => { st.sort = { ...st.sort, dir }; }, { keepSelection: true }); }
    if ((el = q("[data-density-pick]"))) { st.density = el.dataset.densityPick; closeSub("density"); return render(); }
    // columns: several can change, so the menu stays open
    if ((el = q("[data-col-toggle]"))) { const k = el.dataset.colToggle; st.hidden = st.hidden.includes(k) ? st.hidden.filter((x) => x !== k) : [...st.hidden, k]; return render(); }
    if (q("[data-info]")) return openPop("info");
    if ((el = q("[data-filter]"))) return openPop("filter", el.dataset.filter);
    if ((el = q("[data-remove]"))) {
      const key = el.dataset.remove;
      const inPop = pop.contains(el);
      st.added = st.added.filter((k) => k !== key);
      setFilter(key, undefined);
      if (!inPop) $("#add-filter").focus({ preventScroll: true });
      return;
    }
    if (q("#add-filter")) return openPop("add");
    if (q("#date-range")) return openPop("filter", cfg.dateKey);
    if ((el = q("[data-add]"))) {
      const key = el.dataset.add;
      st.added.push(key);
      lastClose = { id: null, t: 0 };
      pop.hidePopover();
      renderToolbar();
      return openPop("filter", key);
    }
    if (q("[data-clear-all]")) { st.added = []; set(() => { st.filters = {}; st.terms = []; st.search = ""; }); $("#search").focus({ preventScroll: true }); return; }
    if (q("[data-clear-search]")) { set(() => { st.terms = []; st.search = ""; }); $("#search").focus({ preventScroll: true }); return; }
    if ((el = q("[data-remove-term]"))) { const i = +el.dataset.removeTerm; set(() => st.terms.splice(i, 1)); $("#search").focus({ preventScroll: true }); return; }
    if ((el = q("[data-edit-term]"))) { const i = +el.dataset.editTerm; const t = st.terms[i]; set(() => { st.terms.splice(i, 1); st.search = t; }); const s = $("#search"); s.focus({ preventScroll: true }); s.select(); return; }
    if (q("#view-options")) return openPop("display");
    if ((el = q("[data-view]"))) { pop.hidePopover(); applyView(cfg.views.find((v) => v.id === el.dataset.view)); render(); return; }
    if (q("[data-reset-view]")) { if (pop.matches(":popover-open")) pop.hidePopover(); applyView(currentView()); render(); return; }
    if ((el = q("[data-sort]"))) {
      const key = el.dataset.sort;
      const col = cfg.columns.find((c) => c.key === key);
      set(() => { st.sort = st.sort.key === key ? { key, dir: st.sort.dir === "asc" ? "desc" : "asc" } : { key, dir: col.numeric || /date|created|modified|issued|due|updated|contact/i.test(key) ? "desc" : "asc" }; }, { keepSelection: true });
      // the header is sticky: a plain focus() scrolls the page to where the header would sit unstuck
      $(`[data-sort="${key}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (q("[data-load-more]")) { loadMore({ focus: e.detail === 0 }); return; }
    if ((el = q("[data-group]"))) {
      const k = el.dataset.group;
      st.collapsed.has(k) ? st.collapsed.delete(k) : st.collapsed.add(k);
      renderBody();
      $(`[data-group="${CSS.escape(k)}"]`)?.focus({ preventScroll: true });
      return;
    }
    if ((el = q("[data-row-menu]"))) return openPop("row", el.dataset.rowMenu, el);
    if ((el = q("[data-bulk-menu]"))) return openPop("bulk", el.dataset.bulkMenu, el);
    if ((el = q("[data-peek]"))) { e.preventDefault(); openPeek(el.dataset.peek); return; }
    if (q("[data-detail-close]")) return closeDetail();
    if ((el = q("[data-tl-more]"))) { const ol = el.closest(".timeline"); $$("[data-fold]", ol).forEach((li) => (li.hidden = false)); const first = $("[data-fold]", ol); el.closest("li").remove(); first?.setAttribute("tabindex", "-1"); first?.focus({ preventScroll: true }); return; }
    if (q("[data-select-matching]")) { rowsWhere().forEach((x) => st.selected.add(x.id)); renderBody(); renderBulk(); $("#bulk-bar .floating-bar-link")?.focus(); return; }
    if (q("[data-clear-selection]")) { st.selected.clear(); renderBody(); renderBulk(); $("#select-page")?.focus({ preventScroll: true }); return; }
    if ((el = q("[data-confirm]"))) { if (pop.contains(el)) pop.hidePopover(); return openConfirm(el.dataset.confirm); }
    if (q("#confirm-go")) {
      const what = $("#confirm-go").dataset.action;
      $("#confirm").close();
      st.selected.clear(); renderBody(); renderBulk();
      toast(`Concept only: “${what}” isn't wired up.`);
      return;
    }
    if (q("[data-retry]")) { st.mode = "loading"; render(); setTimeout(() => { st.mode = "ready"; render(); }, 900); return; }
    if ((el = q("[data-concept-action]"))) {
      if (pop.contains(el)) pop.hidePopover();
      toast(`Concept only: “${el.dataset.conceptAction}” isn't wired up.`);
      return;
    }
    if (q("#create") || q("#export")) { toast(`Concept only: “${t.closest("button").textContent.trim()}” isn't wired up.`); return; }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-opt]")) {
      const key = popFor.key;
      const cur = new Set(st.filters[key] || []);
      t.checked ? cur.add(t.dataset.opt) : cur.delete(t.dataset.opt);
      const order = filterDef(key).options.map((o) => o.value);
      return setFilter(key, order.filter((v) => cur.has(v)));
    }
    if (t.matches("[data-single]")) return setFilter(popFor.key, t.dataset.single || undefined);
    if (t.matches("[data-select]")) {
      t.checked ? st.selected.add(t.dataset.select) : st.selected.delete(t.dataset.select);
      t.closest("tr").toggleAttribute("data-selected", t.checked);
      renderBulk();
      syncSelectPage();
      return;
    }
    if (t.id === "select-page") {
      t.dataset.ids.split(",").forEach((id) => (t.checked ? st.selected.add(id) : st.selected.delete(id)));
      renderBody(); renderBulk();
      $("#select-page")?.focus({ preventScroll: true });
      return;
    }
    if (t.id === "cc-state") { st.mode = t.value; st.selected.clear(); render(); }
    if (t.id === "cc-grid") {
      document.documentElement.toggleAttribute("data-grid", t.checked);
      $('[data-tune="net"]').hidden = !t.checked;
      if (!t.checked) tuners.find((x) => x.id === "net")?.close();
      try { localStorage.setItem("bolster-concepts:grid", t.checked ? "on" : "off"); } catch {}
    }
    if (t.id === "cc-cards") { tactile(t.checked); try { localStorage.setItem("bolster-concepts:tactile", t.checked ? "on" : "off"); } catch {} }
    if (t.id === "cc-canvas") { document.documentElement.dataset.canvas = t.value; try { localStorage.setItem("bolster-concepts:canvas", t.value); } catch {} }
  });

  document.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-range]")) return;
    e.preventDefault();
    const num = (id) => { const v = parseFloat($(id).value.replace(/[$,\s]/g, "")); return Number.isFinite(v) ? v : null; };
    const min = num("#range-min"), max = num("#range-max");
    const key = popFor.key;
    setFilter(key, { ...(min != null ? { min } : {}), ...(max != null ? { max } : {}) });
    pop.hidePopover();
  });

  const search = $("#search");
  search.addEventListener("input", (e) => set(() => (st.search = e.target.value)));
  search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitSearch(); return; }
    if (e.key === "Escape" && search.value) { e.preventDefault(); set(() => (st.search = "")); return; }
    // Backspace in an empty field takes back the last search chip
    if (e.key === "Backspace" && !search.value && st.terms.length) { e.preventDefault(); set(() => st.terms.pop()); }
  });
  // leaving the field keeps the words as a chip, so nothing filters the list unseen
  search.addEventListener("change", () => { if (document.activeElement !== search) commitSearch(); });
  // "/" goes to search from anywhere that isn't a text field
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
    if ($("#list-toolbar").hidden) return;
    e.preventDefault();
    $("#search").focus({ preventScroll: true });
  });

  // menus inside the shared popover: arrow keys between items
  pop.addEventListener("keydown", (e) => {
    const trigger = e.target.closest?.("[data-sub]");
    if (trigger && (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); return openSub(trigger.dataset.sub, { focus: true }); }
    const box = e.target.closest?.("[popover]") || pop;
    if (box.matches(".submenu") && e.key === "ArrowLeft") { e.preventDefault(); return sheet() ? closeSub(box.id.replace("pop-sub-", "")) : box.hidePopover(); }
    const items = $$("[role^=menuitem]", box).filter((el) => el.closest("[popover]") === box);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    items[(next + items.length) % items.length].focus();
  });

  // rows keep coming as the footer nears the screen; the button stays for keyboards and short lists
  const foot = $("#list-foot");
  const nearView = () => foot.getBoundingClientRect().top < innerHeight + 240;
  new IntersectionObserver((entries) => {
    if (!entries.some((x) => x.isIntersecting)) return;
    const step = () => { if (st.mode === "ready" && $("[data-load-more]") && nearView()) { loadMore(); requestAnimationFrame(step); } };
    step();
  }, { rootMargin: "0px 0px 240px 0px" }).observe(foot);

  // what sticks (D, from the scrolling research): the page title scrolls away. Under the top bar the card's
  // header sticks, then the table header. Once you're into the list, scrolling down hides the top bar and the
  // card header, leaving the column header; a few pixels back up brings them back.
  const topBar = $(".top-bar");
  const toolbar = $("#list-toolbar");
  const stick = () => {
    const top = topBar.offsetHeight;
    const root = document.documentElement.style;
    root.setProperty("--list-toolbar-top", `${top}px`);
    root.setProperty("--list-head-top", `${top + (toolbar.hidden ? 0 : toolbar.offsetHeight)}px`);
  };
  new ResizeObserver(stick).observe(topBar);
  new ResizeObserver(stick).observe(toolbar);
  addEventListener("resize", stick);

  // ---------- sideways scroll ----------
  // Columns never get narrower than their set width; when they don't fit, the table scrolls sideways
  // in its card, with the checkbox and name pinned on the left. The card's scroller would stop the
  // header from sticking to the page, so the header is moved down with the page instead (--_table-top,
  // the table's top on screen; CSS keeps it under the bars). One table, so headers stay tied to cells.
  const tableWrap = $("#table-wrap");
  let frame = 0;
  function follow() {
    frame = 0;
    const t = $(".data-table", tableWrap), head = t?.tHead;
    if (!head) return;
    const r = t.getBoundingClientRect();
    head.style.setProperty("--_table-top", `${r.top}px`);
    head.style.setProperty("--_room", `${Math.max(0, r.height - head.offsetHeight)}px`);
  }
  function edges() {
    const max = tableWrap.scrollWidth - tableWrap.clientWidth;
    tableWrap.toggleAttribute("data-scrolled", tableWrap.scrollLeft > 1);
    tableWrap.toggleAttribute("data-more", tableWrap.scrollLeft < max - 1);
  }
  function pins() {
    const sel = $(".data-table thead .data-table-select", tableWrap), name = $(".data-table thead [data-primary]", tableWrap);
    tableWrap.style.setProperty("--_sel-w", `${sel?.offsetWidth || 0}px`);
    tableWrap.style.setProperty("--_pin-w", `${(sel?.offsetWidth || 0) + (name?.offsetWidth || 0)}px`);
  }
  const relayout = () => { pins(); edges(); follow(); };
  addEventListener("scroll", () => { if (!frame) frame = requestAnimationFrame(follow); }, { passive: true });
  addEventListener("resize", relayout);
  tableWrap.addEventListener("scroll", edges, { passive: true });
  new ResizeObserver(relayout).observe(tableWrap);
  new MutationObserver(relayout).observe(tableWrap, { childList: true });
  // pinned cells sit above the row's link, so a click anywhere on a row still opens it
  tableWrap.addEventListener("click", (e) => {
    const tr = e.target.closest("tbody tr[data-id]");
    if (!tr || e.target.closest("a, button, input, label, select")) return;
    openPeek(tr.dataset.id);
  });

  const html = document.documentElement;
  const DOWN = 24, UP = 6; // px of travel before the bars go, and before they come back
  let lastY = scrollY, travel = 0;
  const setChrome = (hidden) => { if (html.hasAttribute("data-chrome-hidden") !== hidden) html.toggleAttribute("data-chrome-hidden", hidden); };
  // keep them while something up there is in use: a menu, a focused field, the sidebar overlay
  const busy = () => !!document.querySelector(":popover-open, dialog[open], .sidebar[data-open]") || !!document.activeElement?.closest?.(".top-bar, #list-toolbar");
  addEventListener("scroll", () => {
    const y = scrollY, dy = y - lastY;
    lastY = y;
    // only once the card header has reached the top bar; above that the page scrolls as normal
    const into = $(".list-panel").getBoundingClientRect().top < topBar.offsetHeight;
    if (!into || busy()) { travel = 0; return setChrome(false); }
    travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
    if (travel > DOWN) setChrome(true);
    else if (travel < -UP) setChrome(false);
  }, { passive: true });
  // tabbing into the top bar or the card header brings them back
  document.addEventListener("focusin", (e) => { if (e.target.closest?.(".top-bar, #list-toolbar")) setChrome(false); });

  // ---------- lists: switch by hash, keep each list's state for the session ----------
  function load() {
    const [id, query] = location.hash.slice(1).split("?");
    const next = configs[id] || configs.jobs;
    if (cfg && st) saved[cfg.id] = st;
    if (pop.matches(":popover-open")) pop.hidePopover();
    if (openId) closeDetail({ focus: false });
    cfg = next;
    st = saved[cfg.id] || fresh(cfg);
    if (query) fromHash(query);
    render();
    stick();
  }
  // ---------- tuners: concept tooling, a panel of sliders that writes custom properties, opened from Concept controls ----------
  // groups are [legend, rows, note?]; a row is [key, label, min, max, step, unit], [key, label, "color"] or [key, label, "check"].
  // Values live in localStorage; "Copy settings" puts them on the clipboard to paste in the chat.
  const tuners = [];
  function tuner({ id, title, groups, def, presets, set }) {
    const rows = groups.flatMap(([, r]) => r), key = `bolster-concepts:${id}`;
    let v = { ...def }, panel;
    try { v = { ...def, ...JSON.parse(localStorage.getItem(key)) }; } catch {}
    const fmt = (r) => (r[2] === "color" ? v[r[0]] : r[2] === "check" ? (v[r[0]] ? "on" : "off") : Number(v[r[0]]).toFixed((String(r[4]).split(".")[1] || "").length) + r[5]);
    const preset = () => Object.keys(presets || {}).find((n) => rows.every(([k]) => ({ ...def, ...presets[n] })[k] === v[k])) || "";
    function apply() {
      set(v, def);
      if (panel) {
        for (const r of rows) {
          const el = panel.querySelector(`#${id}-${r[0]}`);
          if (r[2] === "check") el.checked = v[r[0]]; else el.value = v[r[0]];
          const o = panel.querySelector(`#${id}-o-${r[0]}`); if (o) o.textContent = fmt(r);
          panel.querySelector(`[data-k="${r[0]}"]`).toggleAttribute("data-changed", v[r[0]] !== def[r[0]]);
        }
        const p = panel.querySelector("[data-preset]"); if (p) p.value = preset();
      }
      try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
    }
    const settings = () => {
      const edited = rows.filter(([k]) => v[k] !== def[k]).map(([, l]) => l.toLowerCase());
      const from = preset();
      return `${title} settings (in the concept)${from ? `, preset "${presets[from].name}"` : ""}${edited.length ? `, edited: ${edited.join(", ")}` : ", unchanged"}
${groups.map(([t, rs]) => `${t}: ${rs.map((r) => `${r[1].toLowerCase()} ${fmt(r)}`).join(" · ")}`).join("\n")}
${JSON.stringify(v)}`;
    };
    const opener = () => $(`[data-tune="${id}"]`);
    const close = () => { if (panel && !panel.hidden) { panel.hidden = true; opener()?.focus(); } };
    function toggle() {
      if (!panel) {
        panel = document.createElement("section");
        panel.className = "tuner-panel"; panel.hidden = true; panel.setAttribute("aria-label", title);
        const row = (r) => r[2] === "color"
          ? `<div class="tuner-row" data-k="${r[0]}"><label for="${id}-${r[0]}">${r[1]}</label><input type="color" id="${id}-${r[0]}"></div>`
          : r[2] === "check"
            ? `<div class="tuner-row" data-k="${r[0]}" data-check><label class="choice"><input type="checkbox" id="${id}-${r[0]}"> ${r[1]}</label></div>`
            : `<div class="tuner-row" data-k="${r[0]}"><label for="${id}-${r[0]}">${r[1]}</label><output id="${id}-o-${r[0]}"></output><input type="range" id="${id}-${r[0]}" min="${r[2]}" max="${r[3]}" step="${r[4]}"></div>`;
        panel.innerHTML = `<header><span class="concept-tag">Concept</span> ${title}<button type="button" class="button" data-variant="ghost" data-size="sm" data-icon-only aria-label="Close" data-tune-close>${I.xl}</button></header>
          <div class="tuner-body">${presets ? `<div class="field" data-size="sm"><label class="field-label" for="${id}-preset">Start from</label><div class="select"><select class="input" id="${id}-preset" data-preset>${Object.entries(presets).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join("")}<option value="" hidden>Custom</option></select></div></div>` : ""}
          ${groups.map(([t, rs, note]) => `<fieldset><legend>${t}</legend>${note ? `<p class="tuner-note">${note}</p>` : ""}${rs.map(row).join("")}</fieldset>`).join("")}</div>
          <div class="tuner-foot"><button type="button" class="button" data-size="sm" data-tune-copy>Copy settings</button><button type="button" class="button" data-variant="ghost" data-size="sm" data-tune-reset>Reset</button><span aria-live="polite"></span></div>`;
        document.body.append(panel);
        panel.addEventListener("input", (e) => {
          const t = e.target;
          if (t.matches("[data-preset]")) { if (t.value) { const { name, ...p } = presets[t.value]; v = { ...def, ...p }; apply(); } return; }
          const k = t.id.slice(id.length + 1);
          if (k in v) { v[k] = t.type === "color" ? t.value : t.type === "checkbox" ? t.checked : Number(t.value); apply(); }
        });
        panel.addEventListener("click", (e) => {
          if (e.target.closest("[data-tune-close]")) close();
          if (e.target.closest("[data-tune-reset]")) { v = { ...def }; apply(); }
          if (e.target.closest("[data-tune-copy]")) {
            const out = panel.querySelector(".tuner-foot span"), say = (m) => { out.textContent = m; setTimeout(() => (out.textContent = ""), 2500); };
            navigator.clipboard?.writeText(settings()).then(() => say("Copied. Paste it in the chat."), () => say("Couldn't copy here."));
          }
        });
        panel.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
      }
      // one panel at a time: they share the corner
      for (const t of tuners) if (t !== self) t.close();
      panel.hidden = !panel.hidden;
      apply();
      if (!panel.hidden) panel.querySelector("input, select").focus();
    }
    const self = { id, toggle, close, get v() { return v; } };
    tuners.push(self);
    apply();
    return self;
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-tune]"); if (b) tuners.find((t) => t.id === b.dataset.tune)?.toggle(); });

  // ---------- canvas grid: cells sized from the page header, a light that eases toward the pointer ----------
  {
    const main = $(".app-main"), head = $(".page-header"), root = document.documentElement.style;
    let grid;
    const cell = () => root.setProperty("--net-cell", `${head.offsetHeight / grid.v.div}px`);
    grid = tuner({
      id: "net", title: "Grid",
      groups: [
        ["Grid", [["div", "Cells per header height", 1, 4, 1, ""], ["w", "Line width", 0.5, 3, 0.5, "px"]]],
        ["Light around the pointer", [["r", "Radius", 60, 600, 10, "px"], ["ratio", "Width to height", 0.5, 2.5, 0.05, "×"], ["core", "Solid centre", 0, 80, 5, "%"], ["peak", "Strength", 0, 1, 0.05, ""], ["base", "Grid away from the pointer", 0, 0.6, 0.01, ""]]],
        ["Light theme", [["lineL", "Line colour", "color"], ["lineLa", "Line strength", 0, 0.4, 0.01, ""], ["glowL", "Glow colour", "color"], ["glowLa", "Glow strength", 0, 0.6, 0.01, ""]]],
        ["Dark theme", [["lineD", "Line colour", "color"], ["lineDa", "Line strength", 0, 0.4, 0.01, ""], ["glowD", "Glow colour", "color"], ["glowDa", "Glow strength", 0, 0.6, 0.01, ""]]],
        ["Glow and motion", [["gr", "Glow radius", 80, 800, 10, "px"], ["trail", "Trail", 0, 0.95, 0.05, ""], ["fade", "Fade in and out", 0, 800, 20, "ms"]]],
      ],
      def: { div: 2, w: 1, r: 260, ratio: 1.3, core: 10, peak: 1, base: 0.25, lineL: "#3b3320", lineLa: 0.09, glowL: "#f7f5ef", glowLa: 0, lineD: "#ffffff", lineDa: 0.07, glowD: "#6b93ff", glowDa: 0.12, gr: 420, trail: 0.8, fade: 800 },
      set(v, def) {
        const px = (k) => `${v[k]}px`;
        Object.entries({ "--net-w": px("w"), "--net-r": px("r"), "--net-ratio": v.ratio, "--net-core": `${v.core}%`, "--net-peak": v.peak, "--net-base": v.base,
          "--net-line-la": v.lineLa, "--net-line-d": v.lineD, "--net-line-da": v.lineDa, "--net-glow-l": v.glowL, "--net-glow-la": v.glowLa,
          "--net-glow-d": v.glowD, "--net-glow-da": v.glowDa, "--net-gr": px("gr"), "--net-fade": `${v.fade}ms` }).forEach(([k, x]) => root.setProperty(k, x));
        // the light line follows the canvas (cement on warm, black on cool) until a colour is picked
        if (v.lineL === def.lineL) root.removeProperty("--net-line-l"); else root.setProperty("--net-line-l", v.lineL);
        if (grid) cell();
      },
    });
    new ResizeObserver(cell).observe(head);

    // the light eases toward the pointer, one write per frame, on the layers only (see the CSS)
    const layers = $(".canvas-layers"), net = $(".canvas-net"), lay = layers.style;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let px = 0, py = 0, x = 0, y = 0, raf = 0, placed = false, over = false;
    const tick = () => {
      raf = 0;
      const n = net.getBoundingClientRect();
      // how far the layers have stuck below the top of the page, so the pattern stays on the page
      lay.setProperty("--_oy", `${Math.round(n.top - main.getBoundingClientRect().top)}px`);
      if (!over) return;
      const tx = px - n.left, ty = py - n.top, k = still.matches ? 0 : grid.v.trail;
      if (!placed) { x = tx; y = ty; placed = true; }
      x += (tx - x) * (1 - k); y += (ty - y) * (1 - k);
      lay.setProperty("--_nx", `${x.toFixed(1)}px`); lay.setProperty("--_ny", `${y.toFixed(1)}px`);
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.3) go();
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    main.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" || !document.documentElement.hasAttribute("data-grid")) return;
      px = e.clientX; py = e.clientY; over = true;
      lay.setProperty("--_vis", "1");
      go();
    });
    main.addEventListener("pointerleave", () => { lay.setProperty("--_vis", "0"); over = placed = false; });
    addEventListener("scroll", go, { passive: true });
    addEventListener("resize", go);
    go();
  }

  // ---------- tactile cards: the CTAs' body for cards, quieter (see the CSS) ----------
  const cards = tuner({
    id: "cards", title: "Cards",
    groups: [
      ["Shape and body", [["radius", "Corner radius", 4, 20, 1, "px"], ["edge", "Bottom edge, darker by", 0, 40, 1, "%"], ["lip", "Bottom inner line", 0, 0.2, 0.01, ""], ["sheen", "Sheen from the top", 0, 0.3, 0.01, ""], ["shade", "Shade toward the bottom", 0, 0.1, 0.005, ""], ["depth", "Sheen and shade depth", 8, 160, 4, "px"]],
        "Light falls from above: a lighter top, a darker bottom edge, a shadow below. Keep it quieter than the buttons, so cards read as surfaces and buttons as the things you press."],
      ["Shadow", [["sc", "Colour (light theme)", "color"], ["cy", "Contact, offset", 0, 4, 0.5, "px"], ["cb", "Contact, blur", 0, 8, 0.5, "px"], ["ca", "Contact, strength", 0, 0.3, 0.01, ""], ["ay", "Ambient, offset", 0, 24, 1, "px"], ["ab", "Ambient, blur", 0, 48, 1, "px"], ["aa", "Ambient, strength", 0, 0.2, 0.005, ""]],
        "Two layers: a tight contact shadow seats the card, a soft ambient one lifts it. Tinted with the page (cement on warm), since grey shadows look dirty on paper. Keep the ambient low, or a row of cards floats."],
      ["Light and dark", [["lineL", "Top line, light", 0, 1, 0.05, ""], ["lineD", "Top line, dark", 0, 0.2, 0.01, ""], ["darkK", "Dark shadows ×", 1, 4, 0.1, ""]],
        "A white top line barely shows on a white card but carries the edge in dark, where shadows hardly read; so each theme has its own, and dark scales the shadows up."],
      ["Cards you can press", [["lift", "Hover lift", 0, 4, 0.5, "px"], ["hoverK", "Hover shadow ×", 1, 3, 0.1, ""], ["sink", "Press sinks", 0, 3, 0.5, "px"], ["pressIn", "Press, inner shadow", 0, 0.3, 0.01, ""], ["onIn", "Selected, inner shadow", 0, 0.3, 0.01, ""], ["onK", "Selected, shadow ×", 0, 1, 0.05, ""], ["ms", "Duration", 0, 400, 10, "ms"]],
        "Only the status cards move, being buttons. Hover lifts a pixel or two; a press lands at once and eases back; a selected filter stays pressed in, a toggle that's on. Reduced motion keeps them still."],
      ["Apply to", [["slices", "Status cards and the insight", "check"], ["table", "Table card", "check"], ["record", "Record panel", "check"]]],
    ],
    def: { radius: 12, edge: 15, lip: 0.05, sheen: 0.04, shade: 0.015, depth: 64, sc: "#3b3320", cy: 1, cb: 2, ca: 0.07, ay: 4, ab: 10, aa: 0.045, lineL: 0.8, lineD: 0.07, darkK: 2.5,
      lift: 1, hoverK: 1.6, sink: 1, pressIn: 0.1, onIn: 0.07, onK: 0.3, ms: 150, slices: true, table: true, record: true },
    presets: {
      tactile: { name: "Tactile (default)" },
      paper: { name: "Paper: barely there", edge: 8, lip: 0.03, sheen: 0, shade: 0, ca: 0.05, cb: 1, ay: 2, ab: 4, aa: 0.03, lineL: 0.6, lineD: 0.05, lift: 0.5, hoverK: 1.4, sink: 0.5, pressIn: 0.06, onIn: 0.05, onK: 0.4 },
      pillow: { name: "Pillow: deep", radius: 16, edge: 25, lip: 0.08, sheen: 0.08, shade: 0.03, depth: 96, cb: 3, ca: 0.1, ay: 8, ab: 20, aa: 0.07, lineL: 1, lineD: 0.1, lift: 2, hoverK: 1.5, sink: 1.5, pressIn: 0.14, onIn: 0.1, onK: 0.2, ms: 180 },
      flat: { name: "Flat: as before", edge: 0, lip: 0, sheen: 0, shade: 0, ca: 0, aa: 0, lineL: 0, lineD: 0, lift: 0, hoverK: 1, sink: 0, pressIn: 0, onIn: 0, onK: 1 },
    },
    set(v, def) {
      const html = document.documentElement, root = html.style, px = (k) => `${v[k]}px`;
      Object.entries({ "--card-radius": px("radius"), "--card-edge": `${v.edge}%`, "--card-lip": v.lip, "--card-sheen": v.sheen, "--card-shade": v.shade, "--card-depth": px("depth"),
        "--card-cy": px("cy"), "--card-cb": px("cb"), "--card-ca": v.ca, "--card-ay": px("ay"), "--card-ab": px("ab"), "--card-aa": v.aa,
        "--card-line-l": v.lineL, "--card-line-d": v.lineD, "--card-dark-k": v.darkK,
        "--card-lift": px("lift"), "--card-hover-k": v.hoverK, "--card-sink": px("sink"), "--card-press-in": v.pressIn, "--card-on-in": v.onIn, "--card-on-k": v.onK, "--card-ms": `${v.ms}ms` }).forEach(([k, x]) => root.setProperty(k, x));
      // the shadow follows the canvas (cement on warm, black on cool) until a colour is picked
      if (v.sc === def.sc) root.removeProperty("--card-shadow-l"); else root.setProperty("--card-shadow-l", v.sc);
      if (html.hasAttribute("data-tactile")) html.dataset.tactile = ["slices", "table", "record"].filter((k) => v[k]).join(" ");
    },
  });
  const tactile = (on) => {
    const html = document.documentElement;
    if (on) html.dataset.tactile = ["slices", "table", "record"].filter((k) => cards.v[k]).join(" "); else html.removeAttribute("data-tactile");
    $("#cc-cards").checked = on;
    $('[data-tune="cards"]').hidden = !on;
    if (!on) cards.close();
  };

  $("#cc-canvas").value = document.documentElement.dataset.canvas || "paper";
  // the page grid: on unless it was turned off in this browser
  {
    let on = true;
    try { on = localStorage.getItem("bolster-concepts:grid") !== "off"; } catch {}
    document.documentElement.toggleAttribute("data-grid", on);
    $("#cc-grid").checked = on;
    $('[data-tune="net"]').hidden = !on;
  }
  // tactile cards: on unless turned off in this browser
  {
    let on = true;
    try { on = localStorage.getItem("bolster-concepts:tactile") !== "off"; } catch {}
    tactile(on);
  }
  addEventListener("hashchange", load);
  load();
})();
