import { describe, expect, it } from "vitest";
import { pickTemplateForBattleStart } from "./template-resolution.js";

describe("pickTemplateForBattleStart", () => {
  it("prefers override name when provided", () => {
    expect(pickTemplateForBattleStart("swordland", true)).toEqual({
      source: "override",
      templateName: "swordland",
    });
  });

  it("trims override", () => {
    expect(pickTemplateForBattleStart("  other  ", false)).toEqual({
      source: "override",
      templateName: "other",
    });
  });

  it("falls back to default when no override", () => {
    expect(pickTemplateForBattleStart(null, true)).toEqual({ source: "default" });
  });

  it("none when no override and no default", () => {
    expect(pickTemplateForBattleStart(null, false)).toEqual({ source: "none" });
  });

  it("empty override after trim uses default", () => {
    expect(pickTemplateForBattleStart("   ", true)).toEqual({ source: "default" });
  });
});
