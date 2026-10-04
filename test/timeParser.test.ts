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

  it("deve parsear dias e segundos em formatos variados", () => {
    // Dias
    expect(parseTimeToHours("1d").hours).toBeCloseTo(24);
    expect(parseTimeToHours("1 dia").hours).toBeCloseTo(24);
    expect(parseTimeToHours("2 dias").hours).toBeCloseTo(48);
    expect(parseTimeToHours("1d 2h 30m").hours).toBeCloseTo(26.5);
    
    // G-code style com dias, horas, minutos e segundos
    const bambuGcodeStyle = parseTimeToHours("1d 2h 30m 15s");
    expect(bambuGcodeStyle.hours).toBeCloseTo(26.504166, 4);
    expect(bambuGcodeStyle.valid).toBe(true);

    // Segundos isolados
    expect(parseTimeToHours("15s").hours).toBeCloseTo(15 / 3600);
    expect(parseTimeToHours("30seg").hours).toBeCloseTo(30 / 3600);
    expect(parseTimeToHours("45 segundos").hours).toBeCloseTo(45 / 3600);
    expect(parseTimeToHours("2h 30m 15s").hours).toBeCloseTo(2 + 0.5 + 15 / 3600);
  });

  it("deve parsear formato de relógio HH:MM:SS com validação", () => {
    const validClock = parseTimeToHours("02:30:15");
    expect(validClock.valid).toBe(true);
    expect(validClock.hours).toBeCloseTo(2 + 30 / 60 + 15 / 3600);

    // Minutos ou segundos inválidos (>= 60)
    expect(parseTimeToHours("12:65").valid).toBe(false);
    expect(parseTimeToHours("01:20:70").valid).toBe(false);
  });

  it("deve lidar com números puros e emitir warning se > 24", () => {
    const bare90 = parseTimeToHours("90");
    expect(bare90.valid).toBe(true);
    expect(bare90.hours).toBe(90);
    expect(bare90.warning).toContain("Interpretado como 90 horas");

    const bare5 = parseTimeToHours("5");
    expect(bare5.valid).toBe(true);
    expect(bare5.hours).toBe(5);
    expect(bare5.warning).toBeUndefined();
  });

  it("deve invalidar entradas vazias ou irreconhecíveis", () => {
    expect(parseTimeToHours("").valid).toBe(false);
    expect(parseTimeToHours("   ").valid).toBe(false);
    expect(parseTimeToHours("texto sem numeros").valid).toBe(false);
    expect(parseTimeToHours(NaN).valid).toBe(false);
  });

  it("deve formatar horas para string amigável", () => {
    expect(formatHoursToTimeString(1.4)).toBe("1h24min");
    expect(formatHoursToTimeString(2)).toBe("2h");
    expect(formatHoursToTimeString(0.5)).toBe("30min");
    expect(formatHoursToTimeString(0)).toBe("0min");
    expect(formatHoursToTimeString(15 / 3600)).toBe("15s");
    expect(formatHoursToTimeString(26.5)).toBe("26h30min");
  });
});
