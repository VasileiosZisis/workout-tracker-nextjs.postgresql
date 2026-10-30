import { execFileSync } from "node:child_process";

const timeZoneCases: Array<{
  timeZone: string;
  dates: Array<[string, string]>;
}> = [
  {
    timeZone: "Pacific/Kiritimati",
    dates: [
      ["2026-10-29T10:30:00.000Z", "2026-10-30"],
      ["2026-10-31T10:00:00.000Z", "2026-11-01"],
      ["2026-12-31T10:00:00.000Z", "2027-01-01"],
      ["2026-02-03T10:05:00.000Z", "2026-02-04"],
    ],
  },
  {
    timeZone: "America/Los_Angeles",
    dates: [
      ["2026-10-30T06:30:00.000Z", "2026-10-29"],
      ["2026-10-30T07:00:00.000Z", "2026-10-30"],
      ["2026-11-01T06:30:00.000Z", "2026-10-31"],
      ["2027-01-01T07:30:00.000Z", "2026-12-31"],
      ["2026-02-04T07:05:00.000Z", "2026-02-03"],
      ["2026-03-08T09:30:00.000Z", "2026-03-08"],
      ["2026-03-08T10:30:00.000Z", "2026-03-08"],
    ],
  },
  {
    timeZone: "UTC",
    dates: [
      ["2026-10-30T00:00:00.000Z", "2026-10-30"],
      ["2026-12-31T23:59:59.000Z", "2026-12-31"],
      ["2027-01-01T00:00:00.000Z", "2027-01-01"],
      ["2026-02-03T04:05:00.000Z", "2026-02-03"],
    ],
  },
];

describe("formatLocalDate", () => {
  it.each(timeZoneCases)(
    "uses calendar dates in $timeZone",
    ({ timeZone, dates }) => {
      // Set TZ before Node starts; changing it inside a test worker is unreliable.
      const moduleUrl = new URL("./local-date.ts", import.meta.url).href;
      const instants = dates.map(([instant]) => instant);
      const script = `
        import { formatLocalDate } from ${JSON.stringify(moduleUrl)};
        const instants = ${JSON.stringify(instants)};
        process.stdout.write(JSON.stringify(
          instants.map((instant) => formatLocalDate(new Date(instant)))
        ));
      `;
      const output = execFileSync(
        process.execPath,
        ["--input-type=module", "--eval", script],
        { encoding: "utf8", env: { ...process.env, TZ: timeZone } },
      );

      expect(JSON.parse(output)).toEqual(dates.map(([, expected]) => expected));
    },
  );
});
