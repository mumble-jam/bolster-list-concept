// Combobox behaviour (D138, I26): type to find a value in a long list, in the field itself. The list narrows as you
// type, its first row ready for Enter; ↑ and ↓ move, Escape puts back what was there, leaving keeps only what was
// picked (or, where free text is allowed, what's typed). Nothing matching offers to add one, at the end (I2): its
// create form opens with what was typed. Several values sit as chips in the field. On phones the field opens the
// picker sheet, its find box on top.
//
//   BolsterCombobox.attach(input, {
//     options,                 // [{ id, label, detail, keywords }], or async (text) => [...] (a lookup service)
//     add,                     // (text) => Promise<option | null>: opens the create form, resolves with what was made
//     noun: ["client", "clients"],
//     free,                    // what's typed stands without a pick (an address's street line)
//     value,                   // what's picked to start with (an array with data-multiple)
//     onPick,                  // (option) => …, after a pick
//   })
// The pick's id goes to a hidden input inside .combobox, if there is one; with data-multiple, the ids joined by commas.
window.BolsterCombobox = (() => {
  const LIMIT = 50;
  const phone = matchMedia("(max-width: 639px)");
  const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const mark = (text, q) => {
    const i = q ? fold(text).indexOf(fold(q)) : -1;
    return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
  };
  // the label's start first, then a word's start, then anywhere in it, then its detail or keywords
  const rank = (o, q) => {
    const l = fold(o.label);
    if (l.startsWith(q)) return 0;
    if (l.split(/[\s,.-]+/).some((w) => w.startsWith(q))) return 1;
    if (l.includes(q)) return 2;
    return fold(`${o.detail || ""} ${o.keywords || ""}`).includes(q) ? 3 : -1;
  };
  const filter = (all, text) => {
    const q = fold(text.trim());
    if (!q) return all;
    return all.map((o) => [o, rank(o, q)]).filter(([, r]) => r >= 0).sort((a, b) => a[1] - b[1]).map(([o]) => o);
  };
  const X = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const PLUS = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  let uid = 0;

  function attach(input, opts = {}) {
    const box = input.closest(".combobox");
    const multiple = box.hasAttribute("data-multiple");
    const lookup = typeof opts.options === "function";
    const [one, many] = opts.noun || [input.dataset.noun || "option", input.dataset.nounPlural || `${input.dataset.noun || "option"}s`];
    const hidden = box.querySelector('input[type="hidden"]');
    const label = (input.labels?.[0] ? [...input.labels[0].childNodes].filter((n) => !n.classList?.contains("field-optional")).map((n) => n.textContent).join("").trim() : one);
    let list = box.querySelector(".combobox-list");
    if (!list) { list = document.createElement("div"); list.className = "combobox-list"; list.setAttribute("role", "listbox"); list.setAttribute("popover", "manual"); box.append(list); }
    if (!list.id) list.id = `combobox-${++uid}-list`;
    list.setAttribute("aria-label", many.charAt(0).toUpperCase() + many.slice(1));
    const live = document.createElement("span");
    live.className = "visually-hidden"; live.setAttribute("aria-live", "polite");
    box.append(live);

    let picked = multiple ? [...(opts.value || [])] : opts.value || null;
    let committed = multiple ? "" : picked?.label ?? input.value;
    let items = [], active = -1, adding = false, seq = 0, sheet = null, find = null;
    // several values: the order the list opened in (the picks first, as the chips run), kept while it's open, so a row
    // never moves under the pointer when it's ticked; and the row to stay on after a tick
    let order = null, hold = null;
    const known = new Map();
    const isPicked = (o) => (multiple ? picked.some((p) => p.id === o.id) : picked?.id === o.id);
    const field = () => (sheet?.open ? find : input);
    const isOpen = () => list.matches(":popover-open") || !!sheet?.open;

    // ---------- the list ----------
    function render(text, results, { loading, error, total = results.length } = {}) {
      const q = text.trim();
      items = results.slice(0, LIMIT);
      const exact = items.some((o) => fold(o.label) === fold(q));
      adding = !!opts.add && !!q && !exact;
      // the typed letters are marked where they matched: in the name, or in the detail only when the name didn't
      const inLabel = (o) => !!q && fold(o.label).includes(fold(q));
      const rows = items.map((o, i) => `<div class="combobox-option" role="option" id="${list.id}-${i}" aria-selected="${isPicked(o)}"><span>${mark(o.label, q)}</span>${o.detail ? `<span class="combobox-option-detail">${mark(o.detail, inLabel(o) ? "" : q)}</span>` : ""}</div>`);
      let status = "";
      if (loading) status = `Searching ${many}…`;
      else if (error) status = `Couldn't search ${many}. Type again to try once more.`;
      else if (q && !items.length) status = lookup && opts.free ? `Nothing found for “${esc(q)}”. Keep what you typed, or add the rest by hand.` : `No ${many} match “${esc(q)}”`;
      else if (total > items.length) status = "";
      list.innerHTML = (status ? `<p class="combobox-status" role="presentation">${status}</p>` : "") + rows.join("")
        + (total > items.length ? `<p class="combobox-status" data-more role="presentation">${items.length} of ${total} shown. Keep typing to narrow them.</p>` : "")
        + (adding ? `<div class="combobox-option combobox-add" role="option" id="${list.id}-add" aria-selected="false">${PLUS}<span>Add new ${esc(one)} “${esc(q)}”</span></div>` : "");
      // the first row is ready for Enter while typing; with nothing typed, the pick (if any) is; after a tick, the same row
      const rowsN = items.length + (adding ? 1 : 0);
      if (hold && hold.i < rowsN) setActive(hold.i, { by: hold.by });
      else setActive(q ? (rowsN ? 0 : -1) : multiple ? -1 : items.findIndex(isPicked));
      hold = null;
      if (!loading) live.textContent = error ? status : q ? `${items.length ? `${total} ${total === 1 ? one : many}` : `No ${many}`}${adding ? `, or add ${one}` : ""}` : "";
      if (list.matches(":popover-open")) place();
    }
    const rowAt = (i) => (i === items.length && adding ? list.querySelector(".combobox-add") : list.querySelector(`[id="${list.id}-${i}"]`));
    // the one highlighted row, where Enter goes, moved by the keys or the pointer alike, so two rows never light up;
    // `by` says how it got there: the keys add the focus ring, as a menu's rows do under the keyboard
    function setActive(i, { scroll = true, by = "auto" } = {}) {
      list.querySelector("[data-active]")?.removeAttribute("data-active");
      active = i;
      const row = i >= 0 ? rowAt(i) : null;
      if (row) { row.dataset.active = by; if (scroll) row.scrollIntoView({ block: "nearest" }); field().setAttribute("aria-activedescendant", row.id); }
      else field().removeAttribute("aria-activedescendant");
    }
    async function update() {
      const text = field().value, my = ++seq;
      if (!lookup) {
        let r = filter(opts.options || [], text);
        // several values, nothing typed: the picks first, in the chips' order, so the ones the field has no room to
        // show are a click away; that order holds until the list closes or something's typed
        if (multiple && !text.trim()) {
          order ||= [...picked.map((p) => r.find((o) => o.id === p.id)).filter(Boolean), ...r.filter((o) => !isPicked(o))];
          r = order;
        } else order = null;
        return render(text, r, { total: r.length });
      }
      if (!text.trim()) { list.innerHTML = ""; items = []; adding = false; active = -1; if (!sheet?.open) close(); return; }
      const slow = setTimeout(() => my === seq && render(text, [], { loading: true }), 150);
      try { const r = await opts.options(text); if (my === seq) render(text, r); }
      catch { if (my === seq) render(text, [], { error: true }); }
      finally { clearTimeout(slow); }
    }

    // ---------- open, place, close ----------
    function place() {
      const r = (multiple ? box : input).getBoundingClientRect(), gap = 4, pad = 8;
      const w = Math.min(Math.max(r.width, 256), innerWidth - 2 * pad);
      list.style.inlineSize = `${w}px`;
      list.style.left = `${Math.min(Math.max(pad, r.left), innerWidth - w - pad)}px`;
      const below = innerHeight - r.bottom, h = list.offsetHeight;
      if (below < h + gap + pad && r.top > below) { list.style.top = "auto"; list.style.bottom = `${innerHeight - r.top + gap}px`; }
      else { list.style.bottom = "auto"; list.style.top = `${r.bottom + gap}px`; }
    }
    function open() {
      if (phone.matches) return openSheet();
      if (lookup && !input.value.trim()) return;
      if (!list.matches(":popover-open")) list.showPopover();
      input.setAttribute("aria-expanded", "true");
      place();
    }
    function close() {
      if (list.matches(":popover-open")) list.hidePopover();
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1; order = null;
    }
    const replace = () => isOpen() && list.matches(":popover-open") && place();
    addEventListener("scroll", replace, { capture: true, passive: true });
    addEventListener("resize", replace);

    // ---------- picking ----------
    const sync = () => {
      if (hidden) hidden.value = multiple ? picked.map((p) => p.id).join(",") : picked?.id ?? "";
      if (multiple) known.set(picked.map((p) => p.label).join(", "), [...picked]);
    };
    async function choose(i) {
      if (i === items.length && adding) {
        const text = field().value.trim();
        if (sheet?.open) sheet.close(); else close();
        const made = await opts.add(text);
        if (made) commit(made); else input.focus();
        return;
      }
      if (items[i]) commit(items[i]);
    }
    function commit(o) {
      if (multiple) {
        picked = isPicked(o) ? picked.filter((p) => p.id !== o.id) : [...picked, o];
        live.textContent = isPicked(o) ? `${o.label} added` : `${o.label} removed`;
        if (!field().value.trim()) hold = { i: active, by: list.querySelector("[data-active]")?.dataset.active };
        chips(); field().value = ""; update();
      } else {
        picked = o; committed = o.label; input.value = o.label;
        // back to the field, but not on a phone, where focus would bring up the keyboard
        if (sheet?.open) sheet.close(); else { close(); input.focus(); }
      }
      sync();
      input.dispatchEvent(new Event("change", { bubbles: true }));
      opts.onPick?.(o);
    }
    // leaving keeps only a pick, or what's typed where free text is allowed; a typed name that's an option is picked
    function settle() {
      if (multiple) { input.value = ""; return; }
      const text = input.value.trim();
      if (text === committed) return;
      const exact = (lookup ? items : opts.options || []).find((o) => fold(o.label) === fold(text));
      if (exact && !lookup) return commit(exact);
      if (opts.free) { committed = input.value; picked = null; sync(); return; }
      if (!text) { picked = null; committed = ""; sync(); input.dispatchEvent(new Event("change", { bubbles: true })); return; }
      input.value = committed;
    }

    // ---------- chips (several values): one line, always; what doesn't fit is counted ("+2") ----------
    const more = document.createElement("button");
    more.type = "button"; more.className = "combobox-more"; more.hidden = true; more.tabIndex = -1;
    more.addEventListener("mousedown", (e) => e.preventDefault());
    more.addEventListener("click", () => { input.focus(); if (phone.matches) openSheet(); else { open(); update(); } });
    const MIN = 48; // room left to type in (3rem)
    function fit() {
      const cs = [...box.querySelectorAll(".combobox-chip")];
      cs.forEach((c) => (c.hidden = false));
      more.hidden = true;
      const room = () => input.getBoundingClientRect().width >= MIN - 0.5 && box.scrollWidth <= box.clientWidth + 1;
      let n = 0;
      while (n < cs.length && !room()) {
        cs[cs.length - 1 - n].hidden = true; n++;
        more.hidden = false; more.textContent = `+${n}`;
      }
      if (n) {
        const names = picked.slice(picked.length - n).map((p) => p.label).join(", ");
        more.setAttribute("aria-label", `${n} more: ${names}`); more.dataset.tip = names;
      }
    }
    function chips() {
      box.querySelectorAll(".combobox-chip").forEach((c) => c.remove());
      for (const p of picked) {
        const c = document.createElement("span");
        c.className = "combobox-chip";
        c.innerHTML = `<span>${esc(p.label)}</span><button type="button" aria-label="Remove ${esc(p.label)}" data-tip="Remove">${X}</button>`;
        c.querySelector("button").addEventListener("click", () => { picked = picked.filter((x) => x.id !== p.id); live.textContent = `${p.label} removed`; chips(); sync(); input.focus(); input.dispatchEvent(new Event("change", { bubbles: true })); if (isOpen()) update(); });
        box.insertBefore(c, input);
      }
      if (multiple) { box.insertBefore(more, input); fit(); }
    }
    if (multiple) {
      Object.defineProperty(input, "formValue", { get: () => picked.map((p) => p.label).join(", ") });
      input.formReset = (v) => { picked = [...(known.get(v) || [])]; chips(); sync(); };
      box.addEventListener("mousedown", (e) => { if (e.target === box) { e.preventDefault(); input.focus(); } });
      new ResizeObserver(fit).observe(box);
      chips();
    } else input.formReset = (v) => { input.value = v; committed = v; picked = (opts.options && !lookup ? opts.options.find((o) => o.label === v) : null) || (v ? picked : null); sync(); };
    sync();

    // ---------- keys ----------
    function keys(e) {
      const rowsN = items.length + (adding ? 1 : 0);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen()) { open(); update(); return; }
        if (rowsN) setActive((active + (e.key === "ArrowDown" ? 1 : -1) + rowsN) % rowsN, { by: "keys" });
      } else if (e.key === "Enter") {
        if (!isOpen()) return;
        e.preventDefault();
        if (active >= 0) choose(active); else if (!sheet?.open) close();
      } else if (e.key === "Escape") {
        if (sheet?.open) return;
        if (isOpen() || (!multiple && input.value !== committed)) { e.preventDefault(); e.stopPropagation(); if (!multiple) input.value = committed; close(); }
      } else if (e.key === "Backspace" && multiple && !e.target.value && picked.length) {
        const p = picked.at(-1); picked = picked.slice(0, -1); live.textContent = `${p.label} removed`; chips(); sync(); input.dispatchEvent(new Event("change", { bubbles: true })); if (isOpen()) update();
      }
    }
    input.addEventListener("keydown", keys);
    input.addEventListener("input", () => { open(); update(); });
    input.addEventListener("click", () => { if (phone.matches) return; if (isOpen()) close(); else { open(); update(); } });
    input.addEventListener("pointerdown", (e) => { if (phone.matches) { e.preventDefault(); openSheet(); } });
    input.addEventListener("blur", () => { if (sheet?.open) return; setTimeout(() => { if (document.activeElement !== input && !sheet?.open) { close(); settle(); } }); });
    list.addEventListener("mousedown", (e) => e.preventDefault());
    // pointing at a row makes it the active one (moving, not the list scrolling under a still pointer)
    list.addEventListener("pointermove", (e) => {
      const row = e.target.closest('[role="option"]'); if (!row || row.hasAttribute("data-active")) return;
      setActive(row.classList.contains("combobox-add") ? items.length : +row.id.slice(list.id.length + 1), { scroll: false, by: "pointer" });
    });
    list.addEventListener("click", (e) => {
      const row = e.target.closest('[role="option"]'); if (!row) return;
      choose(row.classList.contains("combobox-add") ? items.length : +row.id.slice(list.id.length + 1));
    });

    // ---------- the sheet (phones) ----------
    function openSheet() {
      if (!sheet) {
        const id = list.id.replace(/-list$/, "");
        sheet = document.createElement("dialog");
        sheet.className = "dialog combobox-sheet";
        sheet.dataset.variant = "sheet";
        sheet.setAttribute("closedby", "any");
        sheet.setAttribute("aria-labelledby", `${id}-sheet-t`);
        sheet.innerHTML = `<div class="dialog-handle" aria-hidden="true"></div><header class="dialog-header"><h2 id="${id}-sheet-t">${esc(label)}</h2><button type="button" class="button" data-variant="ghost" data-icon-only aria-label="Close" data-tip="Close" data-close>${X}</button></header>
          <div class="dialog-body"><div class="combobox-find"><label class="visually-hidden" for="${id}-find">Search ${esc(many)}</label><input class="input" type="search" id="${id}-find" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="${list.id}" autocomplete="off" placeholder="Search ${esc(many)}"></div></div>
          ${multiple ? `<footer class="dialog-footer"><button type="button" class="button" data-close>Done</button></footer>` : ""}`;
        find = sheet.querySelector("input");
        find.addEventListener("keydown", keys);
        find.addEventListener("input", update);
        sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target === sheet) sheet.close(); });
        sheet.addEventListener("close", () => { order = null; box.append(list); list.removeAttribute("style"); input.setAttribute("aria-expanded", "false"); if (!multiple) input.value = committed; });
        box.after(sheet);
      }
      find.value = multiple ? "" : lookup ? input.value : "";
      sheet.querySelector(".dialog-body").append(list);
      sheet.showModal();
      input.setAttribute("aria-expanded", "true");
      update();
      find.focus();
    }

    return { open, close, get value() { return picked; }, set value(v) { picked = multiple ? [...v] : v; if (multiple) chips(); else { committed = v?.label ?? ""; input.value = committed; } sync(); } };
  }

  return { attach, filter };
})();
