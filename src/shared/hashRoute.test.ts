import { describe, expect, it } from "vitest";
import { hashUrlForPath } from "./hashRoute";

describe("hashUrlForPath", () => {
  it("promotes /bid on Vercel to the hash estimator, keeping loc/sample", () => {
    expect(hashUrlForPath("/bid", "?loc=nz&sample=1", "")).toBe("/#/bid?loc=nz&sample=1");
    expect(hashUrlForPath("/bid/", "", "")).toBe("/#/bid");
  });

  it("keeps a GitHub Pages subpath prefix", () => {
    expect(hashUrlForPath("/bidding-wizards/bid", "?loc=au", "")).toBe(
      "/bidding-wizards/#/bid?loc=au",
    );
  });

  it("leaves hash routes and other paths alone", () => {
    expect(hashUrlForPath("/", "", "#/bid?loc=nz")).toBeNull();
    expect(hashUrlForPath("/bid", "", "#/bid?loc=nz")).toBeNull();
    expect(hashUrlForPath("/pitch.html", "", "")).toBeNull();
  });
});
