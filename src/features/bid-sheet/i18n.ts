import { createContext, useContext } from "react";

/** Spanish UI strings, keyed by the English text. Missing keys fall back to English. */
export const ES: Record<string, string> = {
  "New bid": "Nueva cotización",
  "Copy bid": "Copiar cotización",
  "Copy link": "Copiar enlace",
  "Link copied": "Enlace copiado",
  "Procore budget": "Presupuesto Procore",
  QuickBooks: "QuickBooks",
  "Excel": "Excel",
  "Print bid": "Imprimir cotización",
  "Read this job": "Leer el trabajo",
  "Reading…": "Leyendo…",
  "Paste the work in your own words. The on-device catalog fills the sheet. You own the numbers after that.":
    "Describa el trabajo con sus palabras o capture los renglones a mano. Los números son suyos: edite lo que quiera.",
  Materials: "Materiales y equipo",
  "+ Add item": "+ Agregar concepto",
  "+ Add area": "+ Agregar m²",
  Labor: "Mano de obra",
  "+ Add crew": "+ Agregar cuadrilla",
  Role: "Puesto / actividad",
  Crew: "Hombres",
  Days: "Días",
  "Hrs/day": "Horas/día",
  Hours: "Horas",
  Rate: "Tarifa/hora",
  Line: "Importe",
  "Contingency % of direct": "Contingencia % del costo directo",
  "Markup % of cost-to-complete": "Utilidad (markup) % sobre costo",
  "Bid breakdown": "Resumen de la cotización",
  "Plain arithmetic. Not a model.": "Aritmética simple, sin modelos.",
  Contingency: "Contingencia",
  Markup: "Utilidad",
  Profit: "Ganancia",
  Margin: "Margen",
  "profit ÷ bid": "ganancia ÷ total",
  Qty: "Cantidad",
  Unit: "Unidad",
  "Unit cost": "Precio unitario",
  Item: "Concepto",
  "Margin floor %": "Margen mínimo %",
  "Overrun test %": "Prueba de sobrecosto %",
  "Thin margin": "Margen bajo",
  "Margin at or above floor": "Margen en o arriba del mínimo",
  "Contingency is a cushion, not a guarantee. This shows what overruns do to the price you send.":
    "La contingencia es un colchón, no una garantía. Aquí ve qué le hace un sobrecosto al precio que manda.",
  "Classic BidBench": "BidBench clásico",
  "Area item": "Concepto por m²",
  "Length (m)": "Largo (m)",
  "Width (m)": "Ancho (m)",
  "Area (m²)": "Área (m²)",
  Amount: "Importe",
  "Crew lines: people × days × hours/day = hours, then × rate.": "Por cuadrilla: hombres × días × horas/día = horas, luego × tarifa.",
};

export type T = (s: string) => string;
export const tFor = (lang: "en" | "es"): T => (s) => (lang === "es" ? (ES[s] ?? s) : s);
export const TContext = createContext<T>((s) => s);
export const useT = () => useContext(TContext);
