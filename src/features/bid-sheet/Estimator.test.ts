import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Estimator } from "./Estimator";

const render = (url: string) =>
  renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [url] }, createElement(Estimator)));

// Cheap render smoke test: catches a section that throws without needing a browser.
describe("Estimator", () => {
  it("renders every section of a fresh bid", () => {
    const html = render("/bid?loc=nz");
    for (const text of ["Read this job", "Materials", "Labor", "Markup % of cost-to-complete", "Bid breakdown", "Print bid"]) {
      expect(html).toContain(text);
    }
  });

  it("labels tax and area by the market in the URL", () => {
    expect(render("/bid?loc=nz")).toContain("Total inc GST");
    expect(render("/bid?loc=us")).toContain("Sample: ");
  });
});
