import { env } from "./env";

describe("environment defaults", () => {
  it("has a local app URL default", () => {
    expect(env.NEXT_PUBLIC_APP_URL).toBeTruthy();
  });
});
