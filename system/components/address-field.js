// Address field (D139): the street line looks the address up as you type, and a pick fills the parts below it, each
// still editable. The country decides the parts' words (State and ZIP code, Province and Postal code, Region and
// Postal code), the state or province list, and the postal code's check (field.js). Without a lookup it's the same
// fields, typed by hand: nothing to wire, nothing lost, so a product can leave the lookup out and add it later.
//
//   BolsterAddress.attach(el, { lookup })       el: .address, with data-country (the company's country to start with)
//     lookup: async (text, country) => [{ id, label: "1208 Barton Springs Rd", detail: "Austin, TX 78704",
//                                         parts: { street, unit, city, region, postal, country } }]
//   BolsterAddress.line(el)                      the address on one line, as lists and records show it (D59)
window.BolsterAddress = (() => {
  const US = "AL Alabama,AK Alaska,AZ Arizona,AR Arkansas,CA California,CO Colorado,CT Connecticut,DE Delaware,DC District of Columbia,FL Florida,GA Georgia,HI Hawaii,ID Idaho,IL Illinois,IN Indiana,IA Iowa,KS Kansas,KY Kentucky,LA Louisiana,ME Maine,MD Maryland,MA Massachusetts,MI Michigan,MN Minnesota,MS Mississippi,MO Missouri,MT Montana,NE Nebraska,NV Nevada,NH New Hampshire,NJ New Jersey,NM New Mexico,NY New York,NC North Carolina,ND North Dakota,OH Ohio,OK Oklahoma,OR Oregon,PA Pennsylvania,RI Rhode Island,SC South Carolina,SD South Dakota,TN Tennessee,TX Texas,UT Utah,VT Vermont,VA Virginia,WA Washington,WV West Virginia,WI Wisconsin,WY Wyoming";
  const CA = "AB Alberta,BC British Columbia,MB Manitoba,NB New Brunswick,NL Newfoundland and Labrador,NS Nova Scotia,NT Northwest Territories,NU Nunavut,ON Ontario,PE Prince Edward Island,QC Quebec,SK Saskatchewan,YT Yukon";
  const REGIONS = { US, CA };
  const WORDS = { US: ["State", "ZIP code"], CA: ["Province", "Postal code"] };
  const OTHER = ["Region", "Postal code"];
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const part = (el, name) => el.querySelector(`[data-part="${name}"]`);

  // the region's control: a list for the US and Canada, a typed region elsewhere
  function region(el, country, value) {
    const old = part(el, "region"), field = old.closest(".field");
    const id = old.id, name = old.name, list = REGIONS[country];
    const label = field.querySelector(".field-label");
    const [r, p] = WORDS[country] || OTHER;
    label.firstChild.textContent = r + (list ? "" : " ");
    label.querySelector(".field-optional")?.remove();
    if (!list) label.insertAdjacentHTML("beforeend", '<span class="field-optional">(optional)</span>');
    const postal = part(el, "postal");
    postal.labels[0].firstChild.textContent = p;
    postal.inputMode = country === "US" ? "numeric" : "text";
    const html = list
      ? `<div class="select"><select class="input" id="${id}" name="${name}" data-part="region" autocomplete="address-level1"><option value="">Choose</option>${list.split(",").map((s) => { const [code, ...n] = s.split(" "); return `<option value="${code}"${code === value ? " selected" : ""}>${n.join(" ")}</option>`; }).join("")}</select></div>`
      : `<input class="input" id="${id}" name="${name}" data-part="region" autocomplete="address-level1" value="${esc(value)}">`;
    (old.closest(".select") || old).outerHTML = html;
    el.dataset.country = country;
  }

  function attach(el, { lookup } = {}) {
    const street = part(el, "street"), country = part(el, "country");
    country.addEventListener("change", () => region(el, country.value, ""));
    // the region's control and the parts' words follow the country from the start (markup alone: a typed region)
    region(el, country.value, part(el, "region").value);
    if (!lookup || !window.BolsterCombobox) {
      // no lookup: the street line is a plain field
      ["role", "aria-expanded", "aria-autocomplete", "aria-controls"].forEach((a) => street.removeAttribute(a));
      street.closest(".combobox")?.querySelector(".combobox-list")?.remove();
      return;
    }
    BolsterCombobox.attach(street, {
      options: (text) => lookup(text, country.value),
      free: true,
      noun: ["address", "addresses"],
      onPick: (o) => {
        const p = o.parts || {};
        if (p.country && p.country !== country.value) { country.value = p.country; region(el, p.country, p.region); }
        else part(el, "region").value = p.region || "";
        street.value = p.street || o.label;
        part(el, "unit").value = p.unit || "";
        part(el, "city").value = p.city || "";
        part(el, "postal").value = p.postal || "";
        el.querySelectorAll("[data-part]").forEach((x) => x !== street && x.dispatchEvent(new Event("input", { bubbles: true })));
        // on to what the lookup can't know: the unit
        part(el, "unit").focus();
      },
    });
  }

  function line(el) {
    const v = (n) => part(el, n)?.value.trim();
    const c = v("country"), home = el.closest("[data-home-country]")?.dataset.homeCountry || "US";
    return [v("street"), v("unit"), v("city"), [v("region"), v("postal")].filter(Boolean).join(" "), c && c !== home ? part(el, "country").selectedOptions[0]?.textContent : ""].filter(Boolean).join(", ");
  }

  return { attach, line };
})();
