import { describe, expect, it } from "vitest";
import { formatActiveSeconds } from "./session";

describe("formatActiveSeconds", () => {
  it("renders a server-provided duration as minutes and seconds", () => {
    expect(formatActiveSeconds(120)).toBe("2:00");
  });
});
