// Made-up sample data for the specimens' comboboxes and address fields (nothing here is Bolster's or anyone's).
window.SAMPLE = (() => {
  const first = ["Marco", "Ana", "Dwayne", "Priya", "Tomás", "Grace", "Kofi", "Lena", "Hiro", "Rosa", "Sam", "Fatima", "Owen", "Mei", "Andre", "Sofia", "Luis", "Nadia", "Caleb", "Ines"];
  const last = ["Ruiz", "Okafor", "Lindqvist", "Patel", "Brennan", "Nakamura", "Duarte", "Kowalski", "Haddad", "Moreau", "Whitfield", "Osei"];
  const streets = ["Barton Springs Rd", "Orchard Ln", "Cedar Bend Dr", "S Lamar Blvd", "Elm Creek Ct", "Westlake Dr", "Pecan St", "Riverside Dr", "Bluebonnet Ln", "Oak Hollow Way"];
  const cities = ["Austin, TX", "Round Rock, TX", "Pflugerville, TX", "Cedar Park, TX", "Georgetown, TX", "Kyle, TX"];
  // 240 clients: every first name with every last name
  const clients = first.flatMap((f, i) => last.map((l, j) => {
    const n = i * last.length + j;
    return { id: `c${n + 1}`, label: `${f} ${l}`, detail: `${100 + ((n * 37) % 8900)} ${streets[n % streets.length]}, ${cities[n % cities.length]}` };
  }));
  // a crew: the people a job's work can be given to
  const crew = ["Ana Okafor", "Dwayne Brennan", "Hiro Nakamura", "Lena Kowalski", "Luis Duarte", "Mei Haddad", "Owen Whitfield", "Rosa Moreau", "Sam Osei", "Tomás Ruiz"]
    .map((label, i) => ({ id: `t${i + 1}`, label, detail: ["Lead", "Drywall", "Insulation", "Taping", "Framing"][i % 5] }));
  const trades = ["Appliance installer", "Cabinets", "Concrete", "Demolition", "Drywall and insulation", "Electrical", "Flooring", "Framing", "General contractor", "Gutters", "HVAC", "Insulation", "Landscaping", "Masonry", "Painting", "Plumbing", "Roofing", "Siding", "Tile", "Waste disposal", "Windows and doors"]
    .map((label, i) => ({ id: `tr${i + 1}`, label }));

  // what an address lookup service answers: the street line, the rest under it, and the parts
  const places = [
    ["1208 Barton Springs Rd", "", "Austin", "TX", "78704", "US"], ["1210 Barton Springs Rd", "", "Austin", "TX", "78704", "US"],
    ["70 Orchard Ln", "", "Austin", "TX", "78745", "US"], ["4100 Lake Austin Blvd", "", "Austin", "TX", "78703", "US"],
    ["812 Cedar Bend Dr", "", "Round Rock", "TX", "78681", "US"], ["2301 S Lamar Blvd", "Unit 4", "Austin", "TX", "78704", "US"],
    ["15 Elm Creek Ct", "", "Cedar Park", "TX", "78613", "US"], ["901 Pecan St", "", "Pflugerville", "TX", "78660", "US"],
    ["120 Bloor St E", "", "Toronto", "ON", "M4W 1B7", "CA"], ["1200 W Georgia St", "", "Vancouver", "BC", "V6E 4R2", "CA"],
    ["88 Queens Quay W", "", "Toronto", "ON", "M5J 0B8", "CA"], ["14 Orchard Rd", "", "Oxford", "Oxfordshire", "OX2 6LE", "GB"],
  ].map(([street, unit, city, region, postal, country], i) => ({
    id: `p${i + 1}`, label: street, detail: `${city}, ${region} ${postal}${country === "US" ? "" : `, ${{ CA: "Canada", GB: "United Kingdom" }[country]}`}`,
    keywords: `${city} ${postal}`, parts: { street, unit, city, region, postal, country },
  }));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // a lookup over the network: a short wait, the country's places first
  async function lookup(text, country) {
    await wait(300);
    const hits = BolsterCombobox.filter(places, text);
    return [...hits.filter((p) => p.parts.country === country), ...hits.filter((p) => p.parts.country !== country)].slice(0, 6);
  }
  return { clients, crew, trades, places, lookup, wait };
})();
