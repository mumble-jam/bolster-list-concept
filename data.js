// Sample data and per-list configuration for the data list concept.
// Every person, company and number here is made up; the generator is seeded so it's stable.
// A list config is the whole contract: which cards, stats, columns, filters, groups,
// views and bulk actions a list has. data-list.js renders any of them.
// Column widths (w) fit the widest value in the data, or the label with its sort arrow, so
// sorting or loading more never resizes a column; the first column takes what's left.

(() => {
  const TODAY = new Date("2026-10-08T12:00:00");
  const DAY = 864e5;

  // ---------- helpers ----------
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = seeded(678);
  const int = (min, max) => Math.floor(min + r() * (max - min + 1));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const weighted = (pairs) => {
    let x = r() * pairs.reduce((s, p) => s + p[1], 0);
    for (const [v, w] of pairs) if ((x -= w) <= 0) return v;
    return pairs[0][0];
  };
  const money = (min, max) => Math.round(Math.exp(Math.log(min) + r() * (Math.log(max) - Math.log(min))) * 100) / 100;
  const daysAgo = (n) => new Date(TODAY - n * DAY);
  const daysFrom = (d, n) => new Date(+d + n * DAY);
  const ageDays = (d) => Math.round((TODAY - d) / DAY);
  const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmt = {
    money: (n) => usd.format(n),
    whole: (n) => usd0.format(n),
    money0: (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : usd0.format(n)),
    count: (n) => n.toLocaleString("en-US"),
    pct: (n) => `${Math.round(n * 100)}%`,
    date: (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() !== TODAY.getFullYear() ? { year: "numeric" } : {}) }),
    ago: (d) => {
      const n = ageDays(d);
      if (n <= 0) return "Today";
      if (n === 1) return "Yesterday";
      if (n < 7) return `${n} days ago`;
      if (n < 60) return Math.round(n / 7) === 1 ? "1 week ago" : `${Math.round(n / 7)} weeks ago`;
      return fmt.date(d);
    },
    plural: (n, one, many) => `${fmt.count(n)} ${n === 1 ? one : many}`,
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const sum = (rows, get) => rows.reduce((s, x) => s + get(x), 0);
  // below this many decided jobs a rate is noise: the big figure is the count ("2 of 4") instead
  const MIN_SAMPLE = 5;

  // ---------- people and places ----------
  const OWNERS = [
    { id: "hm", name: "Hello Mublejam", color: 1, me: true },
    { id: "dc", name: "Dana Chu", color: 3 },
    { id: "mr", name: "Marco Ruiz", color: 5 },
    { id: "pn", name: "Priya Nair", color: 7 },
  ].map((o) => ({ ...o, initials: initials(o.name) }));
  const owner = () => weighted([[OWNERS[0], 40], [OWNERS[1], 25], [OWNERS[2], 20], [OWNERS[3], 15]]);

  const FIRST = ["Avery", "Jordan", "Sam", "Riley", "Morgan", "Casey", "Taylor", "Jamie", "Alex", "Drew", "Quinn", "Reese", "Rowan", "Emerson", "Harper", "Logan", "Parker", "Sage", "Blake", "Cameron", "Elena", "Tomasz", "Aisha", "Kenji", "Lucia", "Omar", "Ingrid", "Mateo", "Noor", "Vera"];
  const LAST = ["Hollis", "Brennan", "Okafor", "Lindqvist", "Marsh", "Delgado", "Whitaker", "Novak", "Ferreira", "Calloway", "Tran", "Abernathy", "Sorensen", "Pike", "Galloway", "Ruiz-Ortega", "Kowalski", "Ashby", "Mbeki", "Fontaine"];
  const COMPANIES = ["Northgate Property Group", "Harbor View HOA", "Pinecrest Builders", "Summit Dental Studio", "Oakline Rentals", "Brightwater Schools"];
  const CITIES = ["Lakeside", "Maple Grove", "Riverton", "Cedar Falls", "Oak Park", "Fairview", "Brookfield", "Hillcrest"];
  const STREETS = ["Birch St", "Harbor Rd", "Elm Ave", "Lakeview Dr", "Mill Ln", "Pine Ct", "Summit Ave", "Willow Way", "Quarry Rd", "Orchard Ln"];
  const JOBS = ["Basement finish", "Kitchen drywall", "Attic insulation", "Garage drywall", "Soundproofing", "Spray foam", "Ceiling repair", "Fire-rated walls", "Office build-out", "Bathroom remodel", "Water damage repair", "Blown-in insulation", "Crawl space insulation", "Skim coat", "Popcorn ceiling removal"];
  const SOURCES = ["Website", "Referral", "Google", "Home Depot", "Repeat client", "Yard sign"];

  const used = new Set();
  const CLIENTS = [];
  while (CLIENTS.length < 74) {
    const name = CLIENTS.length < COMPANIES.length ? COMPANIES[CLIENTS.length] : `${pick(FIRST)} ${pick(LAST)}`;
    if (used.has(name)) continue;
    used.add(name);
    const city = pick(CITIES);
    CLIENTS.push({ id: `c${CLIENTS.length + 1}`, name, initials: initials(name), color: (hash(name) % 8) + 1, city, address: `${int(12, 980)} ${pick(STREETS)}, ${city}` });
  }

  const emailOf = (c) => `${c.name.split(" ")[0].toLowerCase()}@${c.name.split(" ").slice(-1)[0].toLowerCase().replace(/[^a-z]/g, "")}.example`;
  const latest = (a, b) => (+a > +b ? a : b);
  const earliest = (a, b) => (+a < +b ? a : b);

  // ---------- shared renderers ----------
  const avatar = (p, size) => `<span class="avatar"${size ? ` data-size="${size}"` : ""} data-color="${p.color}" aria-hidden="true">${esc(p.initials)}</span>`;
  const person = (p) => `<span class="cell-person">${avatar(p, "sm")}${esc(p.me ? `${p.name} (you)` : p.name)}</span>`;
  const main = (id, title, sub, who) =>
    `<div class="cell-main">${who ? avatar(who) : ""}<div><a class="data-table-link" href="#${id}" data-peek="${id}">${esc(title)}</a>${sub ? `<div class="cell-sub">${esc(sub)}</div>` : ""}</div></div>`;
  const ownerFilter = (get) => ({
    key: "owner", label: "Owner", type: "enum", pinned: true, get,
    options: OWNERS.map((o) => ({ value: o.id, label: o.me ? `${o.name} (you)` : o.name, html: `${avatar(o, "sm")}${esc(o.me ? `${o.name} (you)` : o.name)}` })),
  });
  const cityFilter = (get) => ({ key: "city", label: "City", type: "enum", get, options: CITIES.map((c) => ({ value: c, label: c })) });
  const pastPresets = [
    { value: "7", label: "Last 7 days", test: (d) => ageDays(d) <= 7 },
    { value: "30", label: "Last 30 days", test: (d) => ageDays(d) <= 30 },
    { value: "90", label: "Last 90 days", test: (d) => ageDays(d) <= 90 },
    { value: "365", label: "Last 12 months", test: (d) => ageDays(d) <= 365 },
    { value: "older90", label: "More than 90 days ago", test: (d) => ageDays(d) > 90 },
  ];
  const statusOptions = (map) => Object.entries(map).map(([value, s]) => ({ value, label: s.label, html: badge(s) }));
  const badge = (s) => `<span class="badge" ${s.attr}${s.mark ? ` data-mark="${s.mark}"` : ""}>${esc(s.label)}</span>`;

  // =====================================================================
  // Estimates
  // =====================================================================
  const EST_STATUS = {
    // shape marks: empty, half, full for how far a job has got; a slash for the client saying no
    draft: { label: "Draft", attr: 'data-status="draft"', dot: "var(--status-draft-mark)", mark: "empty" },
    pending: { label: "Pending", attr: 'data-status="pending"', dot: "var(--status-pending-mark)", mark: "half" },
    booked: { label: "Booked", attr: 'data-status="booked"', dot: "var(--color-status-booked-dot)", mark: "full" },
    declined: { label: "Declined", attr: 'data-tone="danger"', dot: "var(--color-feedback-danger-accent)", mark: "slash" },
  };
  const estimates = Array.from({ length: 132 }, (_, i) => {
    const client = pick(CLIENTS);
    const status = weighted([["draft", 24], ["pending", 34], ["booked", 30], ["declined", 12]]);
    const created = daysAgo(int(0, 240));
    const modified = daysFrom(created, Math.floor(r() * Math.min(40, ageDays(created))));
    const total = status === "draft" && r() < 0.15 ? 0 : money(650, 68000);
    return { id: `est-${2041 + i}`, number: `EST-${2041 + i}`, job: pick(JOBS), client, city: client.city, status, owner: owner(), total, created, modified, source: pick(SOURCES) };
  });

  const estimatesConfig = {
    id: "jobs", nav: "job-list", title: "Jobs", noun: ["job", "jobs"], create: "Create job",
    rows: estimates,
    search: (x) => `${x.job} ${x.client.name} ${x.number} ${x.city}`,
    searchHint: "Search by client, job, address or number",
    dateKey: "created",
    cardKey: "status",
    metrics: [
      { value: "draft", label: "Draft", big: (s) => fmt.money0(sum(s, (x) => x.total)), sub: (s) => `${fmt.plural(s.length, "job", "jobs")} not sent yet` },
      { value: "pending", label: "Pending", big: (s) => fmt.money0(sum(s, (x) => x.total)), sub: (s) => `${fmt.count(s.length)} awaiting reply` },
      { value: "booked", label: "Booked", big: (s) => fmt.money0(sum(s, (x) => x.total)), sub: (s) => `${fmt.plural(s.length, "job", "jobs")} won` },
      { value: "declined", label: "Declined", big: (s) => fmt.money0(sum(s, (x) => x.total)), sub: (s) => `${fmt.plural(s.length, "job", "jobs")} lost` },
    ],
    allCard: { big: (s) => fmt.whole(sum(s, (x) => x.total)) },
    // the one card in the row that isn't a filter: a rate worked out across the slices
    insight: {
      label: "Win rate",
      info: "Booked ÷ (booked + declined), for the jobs your filters let through. Draft and pending jobs aren’t decided yet, so they don’t count.",
      main: (s) => {
        const b = s.filter((x) => x.status === "booked").length, d = s.filter((x) => x.status === "declined").length, n = b + d;
        // every state fills the same three slots (figure, counts, bar), so filtering never reshapes the card
        const bar = [[b, EST_STATUS.booked.dot, "booked"], [d, EST_STATUS.declined.dot, "declined"]];
        if (!n) return { value: "None", counts: "decided yet", bar: [], empty: true };
        if (n < MIN_SAMPLE) return { value: `${b} of ${n}`, counts: "decided", bar };
        return { value: fmt.pct(b / n), counts: `${b} of ${n} decided`, bar };
      },
      more: [{ label: "Average booked job", value: (s) => { const b = s.filter((x) => x.status === "booked"); return b.length ? fmt.money0(sum(b, (x) => x.total) / b.length) : "–"; }, sub: (s) => { const n = s.filter((x) => x.status === "booked").length; return n ? `from ${fmt.plural(n, "job", "jobs")}` : "none booked yet"; } }],
    },
    statusMap: EST_STATUS,
    columns: [
      { key: "job", label: "Job", m: "title", required: true, sort: (x) => `${x.job} ${x.client.name}`, render: (x) => main(x.id, `${x.client.name} · ${x.job}`, `${x.number} · ${x.client.address}`, x.client) },
      { key: "status", label: "Status", w: "6.5rem", m: "badge", sort: (x) => Object.keys(EST_STATUS).indexOf(x.status), render: (x) => badge(EST_STATUS[x.status]) },
      { key: "owner", label: "Owner", w: "12.5rem", hideBelow: "lg", sort: (x) => x.owner.name, render: (x) => person(x.owner) },
      { key: "source", label: "Source", w: "7rem", hidden: true, hideBelow: "lg", sort: (x) => x.source, render: (x) => `<span class="cell-muted">${esc(x.source)}</span>` },
      { key: "created", label: "Created", w: "5.5rem", hideBelow: "lg", sort: (x) => +x.created, render: (x) => `<span class="cell-muted">${fmt.date(x.created)}</span>` },
      { key: "modified", label: "Last activity", w: "7rem", m: "sub", sort: (x) => +x.modified, render: (x) => `<span class="cell-muted">${fmt.ago(x.modified)}</span>` },
      { key: "total", label: "Total", w: "6rem", numeric: true, total: true, m: "trail", sort: (x) => x.total, render: (x) => (x.total ? fmt.money(x.total) : `<span class="text-tertiary">No price yet</span>`), totalFmt: fmt.money },
    ],
    filters: [
      { key: "status", label: "Status", type: "enum", pinned: true, get: (x) => x.status, options: statusOptions(EST_STATUS) },
      ownerFilter((x) => x.owner.id),
      { key: "created", label: "Created", type: "single", pinned: true, get: (x) => x.created, options: pastPresets },
      { key: "total", label: "Total", type: "range", get: (x) => x.total },
      cityFilter((x) => x.city),
      { key: "source", label: "Source", type: "enum", get: (x) => x.source, options: SOURCES.map((s) => ({ value: s, label: s })) },
    ],
    groups: ["status", "owner", "city"],
    defaultSort: { key: "modified", dir: "desc" },
    views: [
      { id: "all", label: "All jobs", icon: "list", filters: {} },
      { id: "mine", label: "My open jobs", icon: "user", filters: { owner: ["hm"], status: ["draft", "pending"] } },
      { id: "stale", label: "Needs follow-up", icon: "clock", filters: { status: ["pending"], created: "older90" }, sort: { key: "created", dir: "asc" } },
      { id: "big", label: "Large jobs", icon: "dollar", filters: { total: { min: 20000 } }, sort: { key: "total", dir: "desc" } },
      { id: "by-owner", label: "By owner", icon: "layers", filters: { status: ["draft", "pending"] }, group: "owner" },
    ],
    bulk: ["Send proposals", "Change owner", "Export", "Archive"],
    rowActions: ["Open", "Preview and send", "Duplicate", "Archive"],
    // the timeline's dots are the status shapes: each event shows the status it moved the job to
    peek: (x) => {
      const h = hash(x.id), S = EST_STATUS;
      const sent = earliest(daysFrom(x.created, 1 + (h % 4)), x.modified);
      const viewed = earliest(daysFrom(sent, 1), x.modified);
      const ev = [{ what: "Job created", meta: `${fmt.date(x.created)} · by ${x.owner.name}`, mark: "empty", color: S.draft.dot }];
      if (x.status === "draft") {
        if (+x.modified > +x.created) ev.push({ what: "Estimate edited", meta: `${fmt.date(x.modified)} · by ${x.owner.name}` });
        ev.push({ what: "Send the proposal", meta: "Not sent yet", next: true });
      } else {
        ev.push({ what: `Proposal sent to ${x.client.name}`, meta: `${fmt.date(sent)} · to ${emailOf(x.client)}`, mark: "half", color: S.pending.dot });
        if (h % 3 || x.status !== "pending") ev.push({ what: "Client viewed the proposal", meta: fmt.date(viewed) });
        if (x.status === "pending") {
          const remind = daysFrom(sent, 7);
          if (+remind < +TODAY) ev.push({ what: "Reminder sent", meta: `${fmt.date(remind)} · automatically` });
          ev.push({ what: `Waiting for ${x.client.name}`, meta: `Follow up by ${fmt.date(latest(daysFrom(sent, 14), daysFrom(TODAY, 2)))}`, next: true });
        }
        if (x.status === "booked") {
          ev.push({ what: "Client approved the proposal", meta: `${fmt.date(x.modified)} · signed by ${x.client.name}`, mark: "full", color: S.booked.dot });
          ev.push({ what: "Schedule the work", meta: "Not scheduled yet", next: true });
        }
        if (x.status === "declined") ev.push({ what: "Client declined the proposal", meta: `${fmt.date(x.modified)} · no reason given`, mark: "slash", color: S.declined.dot });
      }
      return {
        heading: `${x.job} for ${x.client.name}`, open: "Open job",
        badge: badge(S[x.status]), amount: x.total ? fmt.money(x.total) : null, empty: "No price yet", sub: `${x.number} · ${x.client.address}`,
        timeline: ev,
        actions: { draft: [["Send", "send"], ["Edit", "pen"]], pending: [["Remind", "bell"], ["Edit", "pen"]], booked: [["Invoice", "file-plus"], ["Schedule", "calendar"]], declined: [["Duplicate", "copy"], ["Edit", "pen"]] }[x.status],
        fields: [["Client", person(x.client)], ["Owner", person(x.owner)], ["Created", fmt.date(x.created)], ["Last activity", fmt.ago(x.modified)], ["Source", esc(x.source)]],
        doc: x.status === "draft" ? null : { label: "Proposal", name: `Proposal-${x.number}.pdf`, view: "View proposal" },
      };
    },
  };

  // =====================================================================
  // Invoices
  // =====================================================================
  const INV_STATUS = {
    draft: { label: "Draft", attr: 'data-status="draft"', dot: "var(--color-status-draft-dot)" },
    outstanding: { label: "Outstanding", attr: 'data-status="outstanding"', dot: "var(--color-status-outstanding-dot)" },
    overdue: { label: "Overdue", attr: 'data-tone="danger"', dot: "var(--color-feedback-danger-accent)" },
    paid: { label: "Paid", attr: 'data-tone="success"', dot: "var(--color-feedback-success-accent)" },
  };
  const invoices = Array.from({ length: 96 }, (_, i) => {
    const client = pick(CLIENTS);
    const status = weighted([["draft", 10], ["outstanding", 32], ["overdue", 16], ["paid", 42]]);
    const issued = status === "overdue" ? daysAgo(int(34, 120)) : status === "outstanding" ? daysAgo(int(0, 28)) : daysAgo(int(0, 200));
    const due = daysFrom(issued, 30);
    const amount = money(380, 42000);
    const partial = status !== "paid" && status !== "draft" && r() < 0.25;
    const balance = status === "paid" ? 0 : partial ? Math.round(amount * 0.5 * 100) / 100 : amount;
    return { id: `inv-${1180 + i}`, number: `INV-${1180 + i}`, job: pick(JOBS), client, city: client.city, status, owner: owner(), issued, due, amount, balance, paidIn: status === "paid" ? int(2, 41) : null };
  });
  const invoicesConfig = {
    id: "invoices", nav: "invoices", title: "Invoices", noun: ["invoice", "invoices"], create: "Create invoice",
    rows: invoices,
    search: (x) => `${x.number} ${x.client.name} ${x.job} ${x.city}`,
    searchHint: "Search by number, client, job or city",
    dateKey: "issued",
    cardKey: "status",
    metrics: [
      { value: "outstanding", label: "Outstanding", big: (s) => fmt.money0(sum(s, (x) => x.balance)), sub: (s) => `${fmt.plural(s.length, "invoice", "invoices")} not due yet` },
      { value: "overdue", label: "Overdue", big: (s) => fmt.money0(sum(s, (x) => x.balance)), sub: (s) => (s.length ? `Oldest ${Math.max(...s.map((x) => ageDays(x.due)))} days late` : "Nothing late") },
      { value: "paid", label: "Paid", big: (s) => fmt.money0(sum(s, (x) => x.amount)), sub: (s) => `${fmt.plural(s.length, "invoice", "invoices")}` },
      { value: "draft", label: "Draft", big: (s) => fmt.money0(sum(s, (x) => x.amount)), sub: (s) => `${fmt.plural(s.length, "invoice", "invoices")} not sent` },
    ],
    allCard: { big: (s) => fmt.whole(sum(s, (x) => x.amount)) },
    insight: {
      label: "Collected",
      info: "Paid ÷ everything invoiced, by amount, for the invoices your filters let through. Drafts aren’t invoiced yet, so they don’t count.",
      main: (s) => {
        const sent = s.filter((x) => x.status !== "draft"), invoiced = sum(sent, (x) => x.amount), paid = sum(sent.filter((x) => x.status === "paid"), (x) => x.amount);
        if (!invoiced) return { value: "Nothing", counts: "invoiced yet", bar: [], empty: true };
        return { value: fmt.pct(paid / invoiced), counts: `${fmt.money0(paid)} of ${fmt.money0(invoiced)}`, bar: [[paid, INV_STATUS.paid.dot, "paid"], [invoiced - paid, "var(--color-line-default)", "not paid yet"]] };
      },
      more: [{ label: "Average time to pay", value: (s) => { const p = s.filter((x) => x.paidIn); return p.length ? `${Math.round(sum(p, (x) => x.paidIn) / p.length)} days` : "–"; }, sub: (s) => { const n = s.filter((x) => x.paidIn).length; return n ? fmt.plural(n, "paid invoice", "paid invoices") : "none paid yet"; } }],
    },
    statusMap: INV_STATUS,
    columns: [
      { key: "number", label: "Invoice", m: "title", required: true, sort: (x) => x.number, render: (x) => main(x.id, `${x.number} · ${x.client.name}`, x.job, x.client) },
      { key: "status", label: "Status", w: "7.5rem", m: "badge", sort: (x) => Object.keys(INV_STATUS).indexOf(x.status), render: (x) => badge(INV_STATUS[x.status]) },
      { key: "issued", label: "Issued", w: "5rem", hideBelow: "lg", sort: (x) => +x.issued, render: (x) => `<span class="cell-muted">${fmt.date(x.issued)}</span>` },
      { key: "due", label: "Due", w: "8rem", m: "sub", sort: (x) => +x.due, render: (x) => (x.status === "overdue" ? `<span class="cell-danger">${ageDays(x.due)} days late</span>` : x.status === "paid" ? `<span class="cell-muted">Paid in ${x.paidIn} days</span>` : `<span class="cell-muted">${fmt.date(x.due)}</span>`) },
      { key: "owner", label: "Owner", w: "12.5rem", hidden: true, hideBelow: "lg", sort: (x) => x.owner.name, render: (x) => person(x.owner) },
      { key: "amount", label: "Amount", w: "6rem", numeric: true, total: true, hideBelow: "md", sort: (x) => x.amount, render: (x) => fmt.money(x.amount), totalFmt: fmt.money },
      { key: "balance", label: "Balance due", w: "7rem", numeric: true, total: true, m: "trail", sort: (x) => x.balance, render: (x) => (x.balance ? fmt.money(x.balance) : `<span class="text-tertiary">${fmt.money(0)}</span>`), totalFmt: fmt.money },
    ],
    filters: [
      { key: "status", label: "Status", type: "enum", pinned: true, get: (x) => x.status, options: statusOptions(INV_STATUS) },
      { key: "issued", label: "Issued", type: "single", pinned: true, get: (x) => x.issued, options: pastPresets },
      { key: "balance", label: "Balance due", type: "range", get: (x) => x.balance },
      ownerFilter((x) => x.owner.id),
      cityFilter((x) => x.city),
    ],
    groups: ["status", "city", "owner"],
    defaultSort: { key: "issued", dir: "desc" },
    views: [
      { id: "all", label: "All invoices", icon: "list", filters: {} },
      { id: "chase", label: "To chase", icon: "bell", filters: { status: ["overdue"] }, sort: { key: "due", dir: "asc" } },
      { id: "month", label: "Issued this month", icon: "calendar", filters: { issued: "30" } },
    ],
    bulk: ["Send reminder", "Mark as paid", "Download PDFs"],
    rowActions: ["Open", "Send reminder", "Record payment", "Void"],
    peek: (x) => {
      const ev = [];
      if (x.status === "draft") {
        ev.push({ what: "Invoice drafted", meta: `${fmt.date(x.issued)} · by ${x.owner.name}` }, { what: "Send the invoice", meta: "Not sent yet", next: true });
      } else {
        ev.push({ what: `Sent to ${x.client.name}`, meta: `${fmt.date(x.issued)} · to ${emailOf(x.client)}` });
        if (x.balance && x.balance < x.amount) ev.push({ what: "Part payment received", meta: `${fmt.money(x.amount - x.balance)} · by card`, tone: "good" });
        if (x.status === "outstanding") ev.push({ what: `Due ${fmt.date(x.due)}`, meta: `${fmt.money(x.balance)} to collect`, next: true });
        if (x.status === "overdue") {
          ev.push({ what: "Reminder sent", meta: `${fmt.date(daysFrom(x.due, -3))} · automatically` }, { what: "Payment overdue", meta: `${fmt.date(x.due)} · ${ageDays(x.due)} days ago`, tone: "bad" });
          ev.push({ what: `Collect ${fmt.money(x.balance)}`, meta: "Send a reminder or call", next: true });
        }
        if (x.status === "paid") ev.push({ what: "Paid in full", meta: `${fmt.date(earliest(daysFrom(x.issued, x.paidIn), TODAY))} · by card`, tone: "good" });
      }
      return {
        heading: `Invoice to ${x.client.name}`, open: "Open invoice",
        badge: badge(INV_STATUS[x.status]), amount: fmt.money(x.status === "paid" ? x.amount : x.balance), sub: x.status === "paid" ? `${x.number} · paid in full` : x.balance < x.amount ? `${x.number} · balance of ${fmt.money(x.amount)}` : `${x.number} · ${x.job}`,
        timeline: ev,
        actions: { draft: [["Send", "send"], ["Edit", "pen"]], outstanding: [["Remind", "bell"], ["Mark paid", "credit-card"]], overdue: [["Remind", "bell"], ["Mark paid", "credit-card"]], paid: [["Duplicate", "copy"], ["Edit", "pen"]] }[x.status],
        fields: [["Client", person(x.client)], ["Job", esc(x.job)], ["Issued", fmt.date(x.issued)], ["Due", fmt.date(x.due)], ["Owner", person(x.owner)]],
        doc: { label: "Invoice", name: `Invoice-${x.number}.pdf`, view: "View invoice" },
      };
    },
  };

  // =====================================================================
  // Clients
  // =====================================================================
  const CL_STATUS = {
    lead: { label: "Lead", attr: 'data-status="lead"', dot: "var(--color-status-lead-dot)" },
    active: { label: "Active", attr: 'data-status="active"', dot: "var(--color-status-active-dot)" },
    past: { label: "Past", attr: 'data-tone="neutral"', dot: "var(--color-line-strong)" },
  };
  const clients = CLIENTS.map((c) => {
    const status = weighted([["lead", 24], ["active", 34], ["past", 42]]);
    const lastContact = daysAgo(status === "lead" ? int(0, 30) : status === "active" ? int(0, 21) : int(30, 400));
    const first = c.name.split(" ")[0].toLowerCase();
    return {
      ...c, id: `cl-${c.id}`, client: c, status, owner: owner(), source: pick(SOURCES), lastContact,
      openJobs: status === "active" ? int(1, 3) : 0,
      lifetime: status === "lead" ? 0 : money(1800, 96000),
      email: emailOf(c),
      phone: `(555) ${int(200, 899)}-${String(int(0, 9999)).padStart(4, "0")}`,
      since: daysAgo(int(5, 1400)),
    };
  });
  const clientsConfig = {
    id: "customers", nav: "leads-and-customers", title: "Leads and customers", noun: ["customer", "customers"], create: "Add customer",
    rows: clients,
    search: (x) => `${x.name} ${x.email} ${x.phone} ${x.city}`,
    searchHint: "Search by name, email, phone or city",
    dateKey: "lastContact",
    cardKey: "status",
    metrics: [
      { value: "lead", label: "Lead", noCount: true, big: (s) => fmt.count(s.length), sub: (s) => `${s.filter((x) => ageDays(x.lastContact) > 7).length} not contacted this week` },
      { value: "active", label: "Active", noCount: true, big: (s) => fmt.count(s.length), sub: (s) => `${fmt.plural(sum(s, (x) => x.openJobs), "open job", "open jobs")}` },
      { value: "past", label: "Past", noCount: true, big: (s) => fmt.count(s.length), sub: (s) => `${fmt.money0(sum(s, (x) => x.lifetime))} lifetime` },
    ],
    insight: {
      label: "Lifetime value",
      info: "The total of booked jobs for the customers your filters let through.",
      main: (s) => { const n = s.filter((x) => x.lifetime).length; return { value: fmt.money0(sum(s, (x) => x.lifetime)), counts: n ? `across ${fmt.plural(n, "customer", "customers")}` : "no booked jobs yet" }; },
      more: [{ label: "Top source", value: (s) => { const c = {}; s.forEach((x) => (c[x.source] = (c[x.source] || 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || "–"; }, sub: (s) => { const c = {}; s.forEach((x) => (c[x.source] = (c[x.source] || 0) + 1)); const top = Object.values(c).sort((a, b) => b - a)[0]; return top ? `${top} of ${s.length}` : "no sources yet"; } }],
    },
    statusMap: CL_STATUS,
    columns: [
      { key: "name", label: "Customer", m: "title", required: true, sort: (x) => x.name, render: (x) => main(x.id, x.name, x.address, x) },
      { key: "status", label: "Status", w: "5.5rem", m: "badge", sort: (x) => Object.keys(CL_STATUS).indexOf(x.status), render: (x) => badge(CL_STATUS[x.status]) },
      { key: "contact", label: "Contact", w: "14rem", hideBelow: "lg", sort: (x) => x.email, render: (x) => `<div>${esc(x.email)}</div><div class="cell-sub">${esc(x.phone)}</div>` },
      { key: "owner", label: "Owner", w: "12.5rem", hideBelow: "lg", sort: (x) => x.owner.name, render: (x) => person(x.owner) },
      { key: "source", label: "Source", w: "7rem", hidden: true, hideBelow: "lg", sort: (x) => x.source, render: (x) => `<span class="cell-muted">${esc(x.source)}</span>` },
      { key: "lastContact", label: "Last contact", w: "7rem", m: "sub", sort: (x) => +x.lastContact, render: (x) => `<span class="cell-muted">${fmt.ago(x.lastContact)}</span>` },
      { key: "openJobs", label: "Open jobs", w: "6.5rem", numeric: true, hideBelow: "md", sort: (x) => x.openJobs, render: (x) => (x.openJobs || `<span class="text-tertiary">0</span>`), total: true, totalFmt: fmt.count },
      { key: "lifetime", label: "Lifetime value", w: "7.5rem", numeric: true, total: true, m: "trail", sort: (x) => x.lifetime, render: (x) => (x.lifetime ? fmt.whole(x.lifetime) : `<span class="text-tertiary">–</span>`), totalFmt: fmt.whole },
    ],
    filters: [
      { key: "status", label: "Status", type: "enum", pinned: true, get: (x) => x.status, options: statusOptions(CL_STATUS) },
      ownerFilter((x) => x.owner.id),
      { key: "lastContact", label: "Last contact", type: "single", pinned: true, get: (x) => x.lastContact, options: pastPresets },
      cityFilter((x) => x.city),
      { key: "source", label: "Source", type: "enum", get: (x) => x.source, options: SOURCES.map((s) => ({ value: s, label: s })) },
      { key: "lifetime", label: "Lifetime value", type: "range", get: (x) => x.lifetime },
    ],
    groups: ["status", "owner", "city", "source"],
    defaultSort: { key: "lastContact", dir: "desc" },
    views: [
      { id: "all", label: "Everyone", icon: "users", filters: {} },
      { id: "my-leads", label: "My leads", icon: "user", filters: { status: ["lead"], owner: ["hm"] } },
      { id: "quiet", label: "Gone quiet", icon: "clock", filters: { status: ["past"], lastContact: "older90" }, sort: { key: "lifetime", dir: "desc" } },
    ],
    bulk: ["Message", "Change owner", "Archive"],
    rowActions: ["Open", "Message", "Create job", "Archive"],
    peek: (x) => {
      const ev = [{ what: `Added from ${x.source}`, meta: `${fmt.date(x.since)} · by ${x.owner.name}` }];
      if (x.lifetime) ev.push({ what: "First job booked", meta: fmt.date(earliest(daysFrom(x.since, 12), x.lastContact)), tone: "good" });
      ev.push({ what: "Last message", meta: `${fmt.date(x.lastContact)} · by email` });
      if (x.status === "lead") ev.push({ what: "Send a first estimate", meta: "No estimates yet", next: true });
      if (x.status === "active") ev.push({ what: `${fmt.plural(x.openJobs, "job", "jobs")} in progress`, meta: "Nothing overdue", next: true });
      return {
        heading: x.name, open: "Open customer",
        badge: badge(CL_STATUS[x.status]), amount: x.lifetime ? fmt.money(x.lifetime) : null, empty: "No jobs yet", sub: x.lifetime ? `Lifetime value · since ${fmt.date(x.since)}` : `Lead since ${fmt.date(x.since)}`,
        timeline: ev,
        actions: [["Message", "message"], ["Create job", "file-plus"]],
        fields: [["Email", esc(x.email)], ["Phone", esc(x.phone)], ["Address", esc(x.address)], ["Owner", person(x.owner)], ["Source", esc(x.source)], ["Open jobs", String(x.openJobs)]],
        doc: null,
      };
    },
  };

  // =====================================================================
  // Items (catalog): no summary cards, grouped by category by default
  // =====================================================================
  const CATALOG = {
    Drywall: [["1/2 in. drywall, 4×8 sheet", "sheet", 14.2], ["5/8 in. fire-rated, 4×12 sheet", "sheet", 24.9], ["Moisture-resistant board, 4×8", "sheet", 19.6], ["1/4 in. flexible board", "sheet", 22.4], ["Soundproof board, 4×8", "sheet", 54.0], ["Mold-resistant, 4×12", "sheet", 28.7], ["Drywall install, walls", "sq ft", 0.62], ["Drywall install, ceilings", "sq ft", 0.81]],
    Insulation: [["R-13 batts, 2×4 walls", "sq ft", 0.58], ["R-19 batts, 2×6 walls", "sq ft", 0.79], ["R-30 batts, attic", "sq ft", 1.06], ["R-38 blown cellulose", "sq ft", 1.32], ["Closed-cell spray foam, 2 in.", "board ft", 1.24], ["Open-cell spray foam, 3.5 in.", "board ft", 0.52], ["Rigid foam board, 1 in.", "sheet", 18.9], ["Mineral wool, sound", "sq ft", 1.15], ["Vapor barrier, 6 mil", "sq ft", 0.11]],
    Framing: [["Steel stud, 3-5/8 in.", "lin ft", 0.86], ["Wood stud, 2×4×8", "each", 4.12], ["Resilient channel", "lin ft", 0.74], ["Track, 3-5/8 in.", "lin ft", 0.79], ["Blocking and backing", "each", 6.5]],
    Finishing: [["Tape and mud, level 4", "sq ft", 0.48], ["Level 5 finish", "sq ft", 0.96], ["Knockdown texture", "sq ft", 0.42], ["Orange peel texture", "sq ft", 0.38], ["Corner bead, metal", "lin ft", 0.62], ["Joint compound, 4.5 gal", "bucket", 21.5], ["Primer, PVA", "gallon", 18.2], ["Skim coat", "sq ft", 0.71]],
    Labor: [["Hang and finish crew", "hour", 58], ["Insulation installer", "hour", 46], ["Demo and haul-away", "hour", 52], ["Ceiling repair, patch", "each", 145], ["Popcorn removal", "sq ft", 1.45], ["Site protection and cleanup", "each", 180], ["Dumpster, 20 yd", "each", 465]],
  };
  const VENDORS = ["ABC Supply", "Home Depot", "Lowe's", "In-house"];
  const items = Object.entries(CATALOG).flatMap(([category, list]) => list.map(([name, unit, cost]) => {
    const markup = [0.25, 0.3, 0.35, 0.4, 0.5][int(0, 4)];
    return { id: `it-${hash(name)}`, name, category, unit, cost, markup, price: Math.round(cost * (1 + markup) * 100) / 100, vendor: category === "Labor" ? "In-house" : pick(VENDORS.slice(0, 3)), updated: daysAgo(int(0, 300)), usedIn: int(0, 46) };
  }));
  const itemsConfig = {
    id: "catalog", nav: "catalog", title: "Catalog", noun: ["item", "items"], create: "Add item",
    rows: items,
    search: (x) => `${x.name} ${x.category} ${x.vendor}`,
    searchHint: "Search by item, category or vendor",
    dateKey: "updated",
    cardKey: null, metrics: [], insight: null,
    columns: [
      { key: "name", label: "Item", m: "title", required: true, sort: (x) => x.name, render: (x) => main(x.id, x.name, `${x.category} · ${x.vendor}`) },
      { key: "category", label: "Category", w: "6rem", hideBelow: "md", sort: (x) => x.category, render: (x) => `<span class="badge">${esc(x.category)}</span>` },
      { key: "unit", label: "Unit", w: "6.5rem", m: "sub", sort: (x) => x.unit, render: (x) => `<span class="cell-muted">per ${esc(x.unit)}</span>` },
      { key: "vendor", label: "Vendor", w: "7rem", hidden: true, hideBelow: "lg", sort: (x) => x.vendor, render: (x) => `<span class="cell-muted">${esc(x.vendor)}</span>` },
      { key: "cost", label: "Cost", w: "5rem", numeric: true, hideBelow: "md", sort: (x) => x.cost, render: (x) => fmt.money(x.cost) },
      { key: "markup", label: "Markup", w: "5.5rem", numeric: true, hideBelow: "lg", sort: (x) => x.markup, render: (x) => fmt.pct(x.markup) },
      { key: "price", label: "Price", w: "5rem", numeric: true, m: "trail", sort: (x) => x.price, render: (x) => fmt.money(x.price) },
      { key: "usedIn", label: "Used in", w: "7rem", numeric: true, hideBelow: "lg", sort: (x) => x.usedIn, render: (x) => (x.usedIn ? fmt.plural(x.usedIn, "estimate", "estimates") : `<span class="text-tertiary">Unused</span>`) },
      { key: "updated", label: "Price updated", w: "8rem", hidden: true, hideBelow: "lg", sort: (x) => +x.updated, render: (x) => `<span class="cell-muted">${fmt.ago(x.updated)}</span>` },
    ],
    filters: [
      { key: "category", label: "Category", type: "enum", pinned: true, get: (x) => x.category, options: Object.keys(CATALOG).map((c) => ({ value: c, label: c })) },
      { key: "vendor", label: "Vendor", type: "enum", pinned: true, get: (x) => x.vendor, options: VENDORS.map((v) => ({ value: v, label: v })) },
      { key: "price", label: "Price", type: "range", get: (x) => x.price },
      { key: "updated", label: "Price updated", type: "single", get: (x) => x.updated, options: pastPresets },
    ],
    groups: ["category", "vendor"],
    defaultSort: { key: "name", dir: "asc" },
    views: [
      { id: "all", label: "All items", icon: "layers", filters: {}, group: "category" },
      { id: "stale", label: "Prices to review", icon: "clock", filters: { updated: "older90" }, sort: { key: "usedIn", dir: "desc" } },
      { id: "flat", label: "Flat list", icon: "list", filters: {} },
    ],
    bulk: ["Update prices", "Change category", "Archive"],
    rowActions: ["Edit", "Duplicate", "Archive"],
    peek: (x) => ({
      heading: x.name, open: "Edit item",
      badge: `<span class="badge">${esc(x.category)}</span>`, amount: fmt.money(x.price), sub: `per ${x.unit} · cost ${fmt.money(x.cost)} + ${fmt.pct(x.markup)} markup`,
      timeline: [{ what: "Added to the catalog", meta: `${fmt.date(daysFrom(x.updated, -(30 + (hash(x.id) % 300))))} · from ${x.vendor}` }, { what: "Price updated from vendor list", meta: fmt.date(x.updated) }],
      actions: [["Update price", "refresh-cw"], ["Duplicate", "copy"]],
      fields: [["Vendor", esc(x.vendor)], ["Used in", x.usedIn ? fmt.plural(x.usedIn, "estimate", "estimates") : "Unused"], ["Price updated", fmt.ago(x.updated)]],
      doc: null,
    }),
  };

  // menu icons: an attribute keeps its icon in every menu (add filter, group by, sort, columns);
  // the name columns sort by text
  const attrIcons = {
    job: "text", number: "text", name: "text",
    status: "status", owner: "user", city: "location", source: "signpost", contact: "contact",
    created: "calendar", issued: "calendar", due: "calendar", modified: "clock", lastContact: "clock", updated: "clock",
    total: "dollar", amount: "dollar", balance: "dollar", lifetime: "dollar", price: "dollar", cost: "dollar", markup: "percent",
    category: "tag", vendor: "store", unit: "ruler", openJobs: "briefcase", usedIn: "calculator",
  };
  const actionIcons = {
    Open: "sidebar-right", Edit: "pen", "Preview and send": "send", Duplicate: "copy", Archive: "archive",
    "Send reminder": "bell", "Record payment": "credit-card", Void: "ban", Message: "message", "Create job": "file-plus",
  };

  window.BDS_CONCEPT = {
    TODAY, fmt, esc, ageDays, attrIcons, actionIcons,
    configs: { jobs: estimatesConfig, invoices: invoicesConfig, customers: clientsConfig, catalog: itemsConfig },
  };
})();
