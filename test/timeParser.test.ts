import { describe, it, expect } from "vitest";
import { parseTimeToHours, formatHoursToTimeString } from "../src/utils/timeParser";

describe("timeParser", () => {
  it("deve parsear horas decimais diretas", () => {
    expect(parseTimeToHours(1.4).hours).toBeCloseTo(1.4);
    expect(parseTimeToHours("1.4 h").hours).toBeCloseTo(1.4);
    expect(parseTimeToHours("1.4h").hours).toBeCloseTo(1.4);
    expect(parseTimeToHours("2.3 h").hours).toBeCloseTo(2.3);
  });

  it("deve parsear minutos e formatos com h/min", () => {
    expect(parseTimeToHours("45 min").hours).toBeCloseTo(0.75);
    expect(parseTimeToHours("25min").hours).toBeCloseTo(25 / 60);
    expect(parseTimeToHours("340min").hours).toBeCloseTo(340 / 60);
    expect(parseTimeToHours("5h40min").hours).toBeCloseTo(5 + 40 / 60);
    expect(parseTimeToHours("5:40").hours).toBeCloseTo(5 + 40 / 60);
    expect(parseTimeToHours("7h15").hours).toBeCloseTo(7.25);
    expect(parseTimeToHours("3h30").hours).toBeCloseTo(3.5);
  });

  it("deve formatar horas para string amigável", () => {
    expect(formatHoursToTimeString(1.4)).toBe("1h24min");
    expect(formatHoursToTimeString(2)).toBe("2h");
    expect(formatHoursToTimeString(0.5)).toBe("30min");
    expect(formatHoursToTimeString(0)).toBe("0min");
  });
});
