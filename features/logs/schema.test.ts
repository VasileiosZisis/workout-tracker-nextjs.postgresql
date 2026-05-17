import { logFormSchema } from "./schema";

describe("logFormSchema", () => {
  it("accepts valid log titles", () => {
    const parsed = logFormSchema.safeParse({
      title: "Upper Body - Phase 1",
    });

    expect(parsed.success).toBe(true);
  });

  it("trims accepted titles", () => {
    const parsed = logFormSchema.parse({
      title: "  Strength Plan  ",
    });

    expect(parsed.title).toBe("Strength Plan");
  });

  it("rejects blank titles", () => {
    const parsed = logFormSchema.safeParse({
      title: " ",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects HTML-like characters", () => {
    const parsed = logFormSchema.safeParse({
      title: "<script>",
    });

    expect(parsed.success).toBe(false);
  });
});
