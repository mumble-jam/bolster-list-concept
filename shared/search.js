// Global search (D119): direction A of the search research (Figma, "Search · research", 09 A), a panel under the top
// bar's field. Before typing: the type chips, the records you opened last and a few ways to create. Typing turns it into
// results grouped by type, always in one order (customers, jobs, invoices, files, tasks), three each with See all, the
// typed letters marked; the words themselves as a row; Create actions found by their words too. A type chip narrows it
// and shows in the field as a token. The field is a combobox: focus stays in it, the arrows move through the options
// (aria-activedescendant), Enter opens the one in focus. shell.js attaches it to the top bar's field.
(() => {
  const SHARED = new URL("./", document.currentScript.src).href;
  // the concepts' sample records (published, the page beside shared/ holds it: the publish script rewrites this)
  const DATA_JS = "../data.js";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // the types, in the order results come in; list: the shell's link to the type's list page, which takes ?q=
  const TYPES = [
    { key: "customers", label: "Customers", one: "Customer", icon: "users", list: "leads-and-customers" },
    { key: "jobs", label: "Jobs", one: "Job", icon: "briefcase", list: "job-list" },
    { key: "invoices", label: "Invoices", one: "Invoice", icon: "file-invoice", list: "invoices" },
    { key: "files", label: "Files", one: "File", icon: "file", list: null },
    { key: "tasks", label: "Tasks", one: "Task", icon: "square-check", list: "tasks" },
  ];
  const ACTIONS = [
    { label: "Create job", words: "create new job estimate quote" },
    { label: "Create invoice", words: "create new invoice bill" },
    { label: "Add customer", words: "add new customer client lead" },
    { label: "Create task", words: "create new task to-do todo" },
  ];
  const ACROSS = 3, ALONE = 8;

  let records = null;
  const loadData = () => (window.BDS_CONCEPT ? Promise.resolve() : new Promise((ok, no) => document.head.append(Object.assign(document.createElement("script"), { src: new URL(DATA_JS, SHARED).href, onload: ok, onerror: no }))));

  // every record as the panel shows it: a title, the line under it, and the digits a number or phone can be found by
  function build() {
    const { configs, fmt, kit } = window.BDS_CONCEPT;
    const digits = (s) => String(s || "").replace(/\D/g, "");
    // a record's state at its row's end, as its list shows it: the status badge, or an invoice's amount and status
    const badge = (s) => `<span class="badge" ${s.attr}${s.mark ? ` data-mark="${s.mark}"` : ""}>${esc(s.label)}</span>`;
    const st = (key, x) => configs[key].statusMap[x.status];
    return {
      customers: configs.customers.rows.map((x) => ({ type: "customers", id: x.id, title: x.name, sub: x.address, digits: digits(x.phone), meta: badge(st("customers", x)), q: [x.name] })),
      jobs: configs.jobs.rows.map((x) => ({ type: "jobs", id: x.id, title: `${x.client.name} · ${x.job}`, sub: x.client.address, meta: badge(st("jobs", x)), q: [x.client.name, x.job] })),
      invoices: configs.invoices.rows.map((x) => ({ type: "invoices", id: x.id, title: `Invoice ${x.number} · ${x.client.name}`, sub: `${st("invoices", x).label}, due ${fmt.date(x.due)} · ${x.job}`, digits: digits(x.number), meta: `<span class="bs-sp-amount">${fmt.money(x.amount)}</span>`, q: [x.number] })),
      files: kit.FILES.map((x) => ({ type: "files", id: x.id, title: x.name, sub: `${x.job} · added ${fmt.ago(x.added)}` })),
      tasks: kit.TASKS.map(([name, job], i) => ({ type: "tasks", id: `task-${i}`, title: name, sub: job ? `Task · ${job}` : "Task · no job" })),
    };
  }
  // the records "you" opened last (made up, as everything here)
  const RECENT = [["jobs", 0, "opened 10 min ago"], ["customers", 3, "yesterday"], ["invoices", 1, "yesterday"], ["tasks", 0, "2 days ago"]];

  // ---------- matching: every word typed is in the title or the line under it, or a number's or phone's digits ----------
  const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
  function score(r, ws) {
    let s = 0;
    const t = r.title.toLowerCase(), u = r.sub.toLowerCase();
    for (const w of ws) {
      const at = t.indexOf(w);
      if (at === 0 || (at > 0 && /[\s·#(,-]/.test(t[at - 1]))) s += 3; // the start of a word in the title
      else if (at > -1) s += 2;
      else if (u.includes(w)) s += 1;
      else if (/^\d{3,}$/.test(w) && r.digits?.includes(w)) s += 1;
      else return 0;
    }
    return s;
  }
  // the typed letters marked where they are, in either line
  function mark(text, ws) {
    const low = text.toLowerCase(), spans = [];
    for (const w of ws) { let i = low.indexOf(w); while (i > -1) { spans.push([i, i + w.length]); i = low.indexOf(w, i + w.length); } }
    if (!spans.length) return esc(text);
    spans.sort((a, b) => a[0] - b[0]);
    let out = "", at = 0;
    for (const [a, b] of spans) { if (b <= at) continue; const s = Math.max(a, at); out += esc(text.slice(at, s)) + `<mark class="bs-hit">${esc(text.slice(s, b))}</mark>`; at = b; }
    return out + esc(text.slice(at));
  }

  function attach({ box, input, toast, links, ic }) {
    const bar = box.parentElement;
    bar.insertAdjacentHTML("beforeend", `<div class="bs-search-panel" id="bs-search" hidden>
      <div class="bs-sp-types" role="group" aria-label="Search in"></div>
      <div class="bs-sp-body" role="listbox" id="bs-search-list" aria-label="Search"></div>
      <div class="bs-sp-keys" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
    </div>`);
    const panel = bar.querySelector("#bs-search"), types = panel.querySelector(".bs-sp-types"), body = panel.querySelector(".bs-sp-body");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", "bs-search-list");
    input.setAttribute("aria-expanded", "false");
    const PH = input.placeholder;
    let scope = null, opts = [], active = -1;

    const linkTo = (type, q) => { const t = TYPES.find((x) => x.key === type), href = t.list && links[t.list]; if (!href) return null; return q?.length ? `${href}${href.includes("?") ? "&" : "?"}${q.map((x) => `q=${encodeURIComponent(x)}`).join("&")}` : href; };
    const go = (href, what) => { close(); input.blur(); if (href) location.href = href; else toast(`${what} isn't part of this prototype yet.`); };

    // ---------- drawing ----------
    function draw() {
      const q = input.value.trim(), ws = words(q);
      opts = [];
      const opt = (cls, inner, run, label) => { const id = `bs-sp-o${opts.length}`; opts.push({ id, run }); return `<div class="${cls}" role="option" id="${id}" aria-selected="false"${label ? ` aria-label="${esc(label)}"` : ""}>${inner}</div>`; };
      const row = (r, sub) => opt("bs-sp-row", `<span class="bs-sp-icon" data-type="${r.type}" aria-hidden="true">${ic(TYPES.find((t) => t.key === r.type).icon, 16)}</span><span class="bs-sp-text"><span class="bs-sp-title">${mark(r.title, ws)}</span><span class="bs-sp-sub">${sub ?? mark(r.sub, ws)}</span></span>${r.meta ? `<span class="bs-sp-meta">${r.meta}</span>` : ""}`, () => go(linkTo(r.type, r.q), TYPES.find((t) => t.key === r.type).label));
      // a group: an outline card in the panel, its name and See all at its head
      const card = (key, label, rows, more = "") => `<section class="bs-sp-card" role="group" aria-labelledby="bs-sp-h-${key}"><div class="bs-sp-head"><span id="bs-sp-h-${key}">${label}</span>${more}</div>${rows}</section>`;
      // Create: tiles side by side, the next thing to make
      const acts = (list) => list.length ? `<div class="bs-sp-create" role="group" aria-labelledby="bs-sp-h-create"><div class="bs-sp-head"><span id="bs-sp-h-create">Create</span></div><div class="bs-sp-tiles">${list.map((a) => opt("bs-sp-tile", `<span class="bs-sp-icon" aria-hidden="true">${ic("circle-plus", 16)}</span><span class="bs-sp-title">${mark(a.label, ws)}</span>`, () => go(null, a.label))).join("")}</div></div>` : "";
      const counts = {};
      let html = "";
      if (!ws.length) {
        // before typing: what you opened last, then a few ways to create
        const rec = RECENT.filter(([t]) => !scope || t === scope).map(([t, i, when]) => { const r = records[t][i]; return row(r, `${TYPES.find((x) => x.key === t).one} · ${esc(when)}`); });
        html = (rec.length ? card("recent", "Recent", rec.join("")) : "")
          + (scope ? "" : acts(ACTIONS.slice(0, 3)));
      } else {
        let total = 0;
        for (const t of TYPES) {
          const hits = records[t.key].map((r) => [r, score(r, ws)]).filter(([, s]) => s).sort((a, b) => b[1] - a[1]).map(([r]) => r);
          counts[t.key] = hits.length; total += hits.length;
          if (!hits.length || (scope && scope !== t.key)) continue;
          const shown = hits.slice(0, scope ? ALONE : ACROSS), all = linkTo(t.key, [q]);
          // the rows first, then See all: the arrows reach the records before it, though it's drawn in the head
          const rows = shown.map((r) => row(r)).join("");
          const more = hits.length > shown.length && all ? opt("bs-sp-all", `See all ${hits.length}`, () => go(all), `See all ${hits.length} ${t.label.toLowerCase()}`) : "";
          html += card(t.key, t.label, rows, more);
        }
        const n = scope ? counts[scope] : total;
        const found = ACTIONS.filter((a) => ws.every((w) => `${a.label} ${a.words}`.toLowerCase().split(/\s+/).some((x) => x.startsWith(w))));
        if (!n) {
          const where = scope ? TYPES.find((t) => t.key === scope).label.toLowerCase() : "customers, jobs, invoices, files or tasks";
          html += `<div class="bs-sp-none"><p class="bs-sp-none-title">No ${esc(where)} match “${esc(q)}”</p><p>Try a name, an address, or an invoice or phone number.</p>${scope && total ? `<button type="button" class="button" data-variant="secondary" data-size="sm" data-sp-everything>Search everything: ${total} found</button>` : ""}</div>`;
        } else {
          // the words themselves: Enter on this row is the only one that searches (a results page comes later, C)
          html += `<div class="bs-sp-words">${opt("bs-sp-row", `<span class="bs-sp-icon" aria-hidden="true">${ic("search", 16)}</span><span class="bs-sp-text"><span class="bs-sp-title">See all ${n} result${n === 1 ? "" : "s"} for “${esc(q)}”</span></span>`, () => { close(); toast("Concept only: a page of all the results comes later."); })}</div>`;
        }
        html += acts(scope ? [] : found);
      }
      types.innerHTML = [{ key: null, label: "All" }, ...TYPES].map((t) => {
        const c = !ws.length ? null : t.key ? counts[t.key] : Object.values(counts).reduce((a, b) => a + b, 0);
        return `<button type="button" class="bs-sp-type" data-sp-type="${t.key ?? ""}" aria-pressed="${scope === t.key}"${c === 0 ? " data-zero" : ""}>${t.label}${c != null ? `<span class="bs-sp-n">${c}</span>` : ""}</button>`;
      }).join("");
      body.innerHTML = html;
      setActive(ws.length && opts.length ? 0 : -1);
    }
    function setActive(i) {
      active = i;
      body.querySelectorAll("[role=option]").forEach((o) => o.setAttribute("aria-selected", "false"));
      const o = opts[i] && body.querySelector(`#${opts[i].id}`);
      if (o) { o.setAttribute("aria-selected", "true"); input.setAttribute("aria-activedescendant", o.id); o.scrollIntoView({ block: "nearest" }); }
      else input.removeAttribute("aria-activedescendant");
    }

    // ---------- the token in the field: what it's narrowed to ----------
    function setScope(key) {
      scope = key || null;
      box.querySelector(".top-bar-search-scope")?.remove();
      if (scope) {
        const t = TYPES.find((x) => x.key === scope);
        input.insertAdjacentHTML("beforebegin", `<span class="top-bar-search-scope">${t.label}<button type="button" aria-label="Search everything" data-tip="Search everything">${ic("xmark", 12)}</button></span>`);
        input.placeholder = `Search ${t.label.toLowerCase()}`;
      } else input.placeholder = PH;
      draw();
    }

    // ---------- open and close ----------
    function place() {
      const b = bar.getBoundingClientRect(), f = box.getBoundingClientRect();
      Object.assign(panel.style, { insetInlineStart: `${f.left - b.left}px`, inlineSize: `${Math.max(f.width, 440)}px`, insetBlockStart: `${f.bottom - b.top + 6}px` });
    }
    async function open() {
      if (!records) { try { await loadData(); records = build(); } catch { return; } }
      if (document.activeElement !== input) return;
      place(); draw(); panel.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    function close() { panel.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }

    input.addEventListener("focus", open);
    input.addEventListener("input", () => { if (panel.hidden) open(); else draw(); });
    addEventListener("resize", () => { if (!panel.hidden) place(); });
    // leaving both the field and the panel closes it
    const inside = (n) => n && (box.contains(n) || panel.contains(n));
    input.addEventListener("blur", (e) => { if (!inside(e.relatedTarget)) close(); });
    panel.addEventListener("focusout", (e) => { if (!inside(e.relatedTarget)) close(); });
    // a click in the panel keeps the caret in the field (but its buttons still take a click)
    panel.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) e.preventDefault(); });
    panel.addEventListener("click", (e) => {
      const o = e.target.closest("[role=option]");
      if (o) { opts.find((x) => x.id === o.id)?.run(); return; }
      const t = e.target.closest("[data-sp-type]");
      if (t) { setScope(t.dataset.spType); input.focus(); return; }
      if (e.target.closest("[data-sp-everything]")) { setScope(null); input.focus(); }
    });
    panel.addEventListener("pointermove", (e) => { const o = e.target.closest("[role=option]"); if (o) { const i = opts.findIndex((x) => x.id === o.id); if (i !== active) setActive(i); } });
    box.addEventListener("click", (e) => { if (e.target.closest(".top-bar-search-scope button")) { e.preventDefault(); setScope(null); input.focus(); } });
    // before shell.js's own keys on the field (capture runs first at the target)
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (panel.hidden) return open();
        if (!opts.length) return;
        const d = e.key === "ArrowDown" ? 1 : -1;
        setActive(active < 0 ? (d > 0 ? 0 : opts.length - 1) : (active + d + opts.length) % opts.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (opts[active]) opts[active].run();
      } else if (e.key === "Backspace" && scope && input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault(); setScope(null);
      } else if (e.key === "Escape" && !input.value && scope) {
        // a narrowed field widens first, then empties and leaves (shell.js)
        e.preventDefault(); e.stopImmediatePropagation(); setScope(null);
      }
    }, true);
    // the field emptied (Escape or Clear, shell.js): back to before typing
    box.addEventListener("bs-search-cleared", () => { if (!panel.hidden) draw(); });
  }

  window.BolsterSearch = { attach };
})();
