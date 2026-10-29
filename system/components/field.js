// Field behaviour (D136, D137, I27): what a field does with what's typed. A value is tidied into its format when the
// field is left, never while it's typed (the caret never jumps, a paste is never mangled), and only when it's right:
// a value that isn't stays as typed, for its error to say why (form.js shows it, in these words).
//
//   <input class="input" type="tel" data-format="phone">        US and Canada: (555) 014-2290; +… kept international
//   <input class="input" type="email" data-format="email">      spaces gone, the domain in lower case; checked for its shape
//   <input class="input" data-format="postal">                  US: 78704 or 78704-1234; Canada: K1A 0B1
//   <input class="input" data-format="number" data-numeric inputmode="decimal"
//          [data-decimals="2"] [data-step="0.25"] [data-min="0"] [data-max="…"]>   1,250.5; ↑ and ↓ step it
//   <input class="input" data-format="money" …>                 always two decimals: 1,009.10
//
// The country is the nearest [data-country] (an address, the form, the page: the company's), the US when there's none.
// It decides the phone's and the postal code's shape, and how numbers are grouped (1,250.5 or 1.250,5).
//   BolsterField.check(el)   the message for what's wrong with its value, or ""
//   BolsterField.value(el)   what's stored: +15550142290 for a phone, 1250.5 for a number
window.BolsterField = (() => {
  const NANP = ["US", "CA"];
  const LOCALE = { US: "en-US", CA: "en-CA", GB: "en-GB", IE: "en-IE", AU: "en-AU", DE: "de-DE", FR: "fr-FR", ES: "es-ES", IT: "it-IT", NL: "nl-NL", PL: "pl-PL", PT: "pt-PT", UA: "uk-UA" };
  const countryOf = (el) => (el.closest("[data-country]")?.dataset.country || "US").toUpperCase();
  const localeOf = (el) => LOCALE[countryOf(el)] || `en-${countryOf(el)}`;
  const seps = (loc) => { const p = new Intl.NumberFormat(loc).formatToParts(12345.6); return { group: p.find((x) => x.type === "group")?.value || ",", dec: p.find((x) => x.type === "decimal")?.value || "." }; };
  const label = (el) => (el.labels?.[0] ? [...el.labels[0].childNodes].filter((n) => !n.classList?.contains("field-optional")).map((n) => n.textContent).join("").trim() : "This");

  // ---------- phone ----------
  function phone(el, v) {
    const ext = v.match(/\s*(?:ext\.?|x|#)\s*(\d{1,6})\s*$/i);
    const main = ext ? v.slice(0, ext.index) : v;
    const d = main.replace(/\D/g, ""), plus = main.trim().startsWith("+"), nanp = NANP.includes(countryOf(el));
    const tail = ext ? ` ext. ${ext[1]}` : "";
    const national = (n) => `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
    if (plus) {
      if (d.length < 8 || d.length > 15) return { error: "Enter the number with its country code, like +44 20 7946 0958" };
      if (nanp && d.length === 11 && d[0] === "1") return { text: national(d.slice(1)) + tail, stored: `+${d}` };
      return { text: "+" + main.replace(/^\s*\+/, "").replace(/[^\d]+/g, " ").trim() + tail, stored: `+${d}` };
    }
    if (nanp) {
      const n = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
      if (n.length !== 10) return { error: "Enter a 10-digit phone number, like (555) 014-2290, or start with + and the country code" };
      return { text: national(n) + tail, stored: `+1${n}` };
    }
    if (d.length < 6 || d.length > 15) return { error: "Enter a phone number, like +44 20 7946 0958" };
    return { text: main.replace(/[^\d()+]+/g, " ").trim() + tail, stored: d };
  }

  // ---------- email ----------
  function email(el, v) {
    const t = v.replace(/\s+/g, "");
    const at = t.lastIndexOf("@");
    if (at < 1 || !/^[^@]+@[^@]+\.[^@.]{2,}$/.test(t)) return { error: "Enter an email address like name@example.com" };
    return { text: t.slice(0, at + 1) + t.slice(at + 1).toLowerCase(), stored: t.slice(0, at + 1) + t.slice(at + 1).toLowerCase() };
  }

  // ---------- postal code ----------
  function postal(el, v) {
    const c = countryOf(el), t = v.trim().toUpperCase();
    if (c === "US") {
      const d = t.replace(/[\s-]/g, "");
      if (!/^\d{5}(\d{4})?$/.test(d)) return { error: "Enter a 5-digit ZIP code, like 78704" };
      return { text: d.length === 9 ? `${d.slice(0, 5)}-${d.slice(5)}` : d };
    }
    if (c === "CA") {
      const d = t.replace(/\s/g, "");
      if (!/^[A-CEGHJ-NPR-TVXY]\d[A-CEGHJ-NPR-TV-Z]\d[A-CEGHJ-NPR-TV-Z]\d$/.test(d)) return { error: "Enter a postal code like K1A 0B1" };
      return { text: `${d.slice(0, 3)} ${d.slice(3)}` };
    }
    return { text: t.replace(/\s+/g, " ") };
  }

  // ---------- number and money ----------
  function parse(el, v) {
    const { group, dec } = seps(localeOf(el));
    let t = v.replace(/[\s  ]/g, "").replace(/^[$€£]/, "");
    // a group mark has three digits after it, or it isn't one: 12,5 in the US is a mistake, not 125
    const whole = t.split(dec)[0].replace(/^-/, "");
    if (whole.includes(group) && !whole.split(group).every((g, i) => (i ? g.length === 3 : g.length >= 1 && g.length <= 3))) return NaN;
    t = t.split(group).join("");
    if (dec !== ".") t = t.replace(dec, ".");
    return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? +t : NaN;
  }
  function number(el, v, money) {
    const n = parse(el, v), loc = localeOf(el), { dec } = seps(loc);
    if (Number.isNaN(n)) return { error: money ? `Enter an amount, like 1${seps(loc).group}250${dec}00` : `Enter a number, like 12${dec}5` };
    const min = el.dataset.min, max = el.dataset.max;
    if (min !== undefined && n < +min) return { error: `${label(el)} must be ${fmt(el, +min, money)} or more` };
    if (max !== undefined && n > +max) return { error: `${label(el)} must be ${fmt(el, +max, money)} or less` };
    const places = money ? 2 : +(el.dataset.decimals ?? 2);
    const r = Math.round(n * 10 ** places) / 10 ** places;
    return { text: fmt(el, r, money), stored: r };
  }
  const fmt = (el, n, money) => new Intl.NumberFormat(localeOf(el), money ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: +(el.dataset.decimals ?? 2) }).format(n);

  const FORMATS = { phone, email, postal, number: (el, v) => number(el, v, false), money: (el, v) => number(el, v, true) };
  const run = (el) => { const f = FORMATS[el.dataset.format]; const v = el.value; return f && v.trim() ? f(el, v) : null; };
  const check = (el) => run(el)?.error || "";
  const value = (el) => { const r = run(el); return r && !r.error ? r.stored ?? r.text : el.value.trim(); };

  // tidied when left: in the capture phase, so a form checking the same blur sees the tidy value
  document.addEventListener("focusout", (e) => {
    const el = e.target; if (!el.matches?.("input[data-format]")) return;
    const r = run(el);
    if (r && !r.error && r.text !== el.value) { el.value = r.text; el.dispatchEvent(new Event("input", { bubbles: true })); }
  }, true);

  // ↑ and ↓ step a number by its step (Shift: ten steps), held between its min and max
  document.addEventListener("keydown", (e) => {
    const el = e.target;
    if (!el.matches?.('input[data-format="number"], input[data-format="money"]') || el.readOnly || el.disabled) return;
    if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || e.altKey || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const step = +(el.dataset.step || 1) * (e.shiftKey ? 10 : 1);
    let n = el.value.trim() ? parse(el, el.value) : 0;
    if (Number.isNaN(n)) return;
    n = Math.round((n + (e.key === "ArrowUp" ? step : -step)) * 1e6) / 1e6;
    if (el.dataset.min !== undefined) n = Math.max(+el.dataset.min, n);
    if (el.dataset.max !== undefined) n = Math.min(+el.dataset.max, n);
    el.value = fmt(el, n, el.dataset.format === "money");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  return { check, value, countryOf };
})();
