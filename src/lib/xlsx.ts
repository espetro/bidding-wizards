import { breakdown, crewHours, isAreaPricedLine, laborTotal, lineArea, linePricePerArea, materialTotal, type EstimateInput } from "./estimate";
import type { Market } from "./markets";

/**
 * Minimal .xlsx writer (one sheet, inline strings, live formulas). No dependency.
 * ponytail: stored (uncompressed) zip; bids are a few KB, so deflate isn't worth a library.
 */
type Cell = string | number | { f: string; v: number } | null;

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStored(files: { name: string; data: string }[]): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true); // stored
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of all) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const col = (i: number) => String.fromCharCode(65 + i);

function sheetXml(rows: Cell[][]): string {
  const body = rows
    .map((r, ri) => {
      const cells = r
        .map((c, ci) => {
          if (c === null || c === "") return "";
          const ref = `${col(ci)}${ri + 1}`;
          if (typeof c === "number") return `<c r="${ref}"><v>${c}</v></c>`;
          if (typeof c === "string") return `<c r="${ref}" t="inlineStr"><is><t>${esc(c)}</t></is></c>`;
          return `<c r="${ref}"><f>${esc(c.f)}</f><v>${c.v}</v></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="38" customWidth="1"/><col min="2" max="7" width="14" customWidth="1"/></cols><sheetData>${body}</sheetData></worksheet>`;
}

export function xlsxFromRows(rows: Cell[][], sheetName = "Bid"): Uint8Array<ArrayBuffer> {
  return zipStored([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(rows) },
  ]);
}

/**
 * The bid as a spreadsheet the estimator can keep editing: every total is a formula
 * (crew × days × hours/day, hours × rate, contingency, markup, tax), so changing a cell in Excel recomputes the bid.
 */
export function bidRows(input: EstimateInput, market: Pick<Market, "lang" | "taxName" | "areaLabel">): Cell[][] {
  const es = market.lang === "es";
  const L = es
    ? { mat: "Materiales y equipo", item: "Concepto", qty: "Cantidad", unit: "Unidad", price: "Precio unitario", amount: "Importe", lab: "Mano de obra", role: "Puesto", crew: "Hombres", days: "Días", hpd: "Horas/día", hours: "Horas", rate: "Tarifa/hora", direct: "Costo directo", cont: "Contingencia %", contAmt: "Contingencia", markup: "Utilidad (markup) %", markupAmt: "Utilidad", bid: `Total sin ${market.taxName}`, tax: `${market.taxName} %`, taxAmt: market.taxName, total: `Total con ${market.taxName}`, margin: "Margen % (utilidad ÷ total sin impuesto)" }
    : { mat: "Materials", item: "Item", qty: "Qty", unit: "Unit", price: "Unit cost", amount: "Amount", lab: "Labor", role: "Role", crew: "Crew", days: "Days", hpd: "Hrs/day", hours: "Hours", rate: "Rate/hr", direct: "Direct cost", cont: "Contingency %", contAmt: "Contingency", markup: "Markup %", markupAmt: "Markup", bid: `Bid total (ex ${market.taxName})`, tax: `${market.taxName} %`, taxAmt: market.taxName, total: `Total inc ${market.taxName}`, margin: "Margin % (profit ÷ bid)" };
  const b = breakdown(input);
  const rows: Cell[][] = [[L.mat], [L.item, L.qty, L.unit, L.price, L.amount]];
  const matStart = rows.length + 1;
  for (const m of input.materials) {
    if (!m.item && materialTotal(m) === 0) continue;
    const r = rows.length + 1;
    const [name, qty, unit, price] = isAreaPricedLine(m)
      ? [`${m.item || "Area"} (${m.length} × ${m.width})`, lineArea(m), market.areaLabel, linePricePerArea(m)]
      : [m.item, m.quantity, m.unit, m.unitCost];
    rows.push([name, qty, unit, price, { f: `B${r}*D${r}`, v: materialTotal(m) }]);
  }
  const matEnd = rows.length;
  rows.push([], [L.lab], [L.role, L.crew, L.days, L.hpd, L.hours, L.rate, L.amount]);
  const labStart = rows.length + 1;
  for (const l of input.labor) {
    if (!l.role && laborTotal(l) === 0) continue;
    const r = rows.length + 1;
    const crew = l.crew ?? 1;
    const hpd = l.hoursPerDay ?? l.hours;
    const days = l.days ?? 1;
    const hours = l.crew !== undefined ? crewHours(crew, days, hpd) : l.hours;
    rows.push([l.role, crew, days, hpd, { f: `B${r}*C${r}*D${r}`, v: hours }, l.rate, { f: `E${r}*F${r}`, v: laborTotal(l) }]);
  }
  const labEnd = rows.length;
  const sum = (c: string, a: number, z: number) => (z >= a ? `SUM(${c}${a}:${c}${z})` : "0");
  rows.push([]);
  const r0 = rows.length + 1;
  rows.push([L.direct, { f: `${sum("E", matStart, matEnd)}+${sum("G", labStart, labEnd)}`, v: b.direct }]);
  rows.push([L.cont, input.contingencyPct]);
  rows.push([L.contAmt, { f: `B${r0}*B${r0 + 1}/100`, v: b.contingency }]);
  rows.push([L.markup, input.markupPct]);
  rows.push([L.markupAmt, { f: `(B${r0}+B${r0 + 2})*B${r0 + 3}/100`, v: b.markup }]);
  rows.push([L.bid, { f: `B${r0}+B${r0 + 2}+B${r0 + 4}`, v: b.bidTotal }]);
  rows.push([L.tax, input.gstPct ?? 0]);
  rows.push([L.taxAmt, { f: `B${r0 + 5}*B${r0 + 6}/100`, v: b.gst }]);
  rows.push([L.total, { f: `B${r0 + 5}+B${r0 + 7}`, v: b.totalIncGst }]);
  rows.push([L.margin, { f: `IF(B${r0 + 5}>0,B${r0 + 4}/B${r0 + 5}*100,0)`, v: b.marginPct }]);
  return rows;
}
