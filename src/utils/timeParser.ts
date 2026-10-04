/**
 * Utilitários para conversão flexível de strings de tempo em horas decimais e vice-versa.
 * Suporta: "1d 2h 30m 15s", "1 dia", "2d", "1.4 h", "1.4h", "2.3h", "45 min", "5h40min", "5h 40m", "7h15", "2h", "25min", "05:40", "02:30:15", "340min", "15s", "30seg"
 */

export interface ParsedTimeResult {
  hours: number;
  formatted: string;
  valid: boolean;
  warning?: string;
}

export function parseTimeToHours(input: string | number): ParsedTimeResult {
  if (typeof input === "number") {
    if (isNaN(input) || input < 0) {
      return { hours: 0, formatted: "0min", valid: false };
    }
    return {
      hours: input,
      formatted: formatHoursToTimeString(input),
      valid: true
    };
  }

  const str = (input || "").trim().toLowerCase();
  if (!str) return { hours: 0, formatted: "0min", valid: false };

  // Caso: apenas número direto (ex: "1.4", "5.5", "90", "1,5")
  if (/^\d+([.,]\d+)?$/.test(str)) {
    const val = parseFloat(str.replace(",", "."));
    const warning = val > 24
      ? `Interpretado como ${val} horas — se quis dizer minutos, digite "${val}min".`
      : undefined;
    return {
      hours: val,
      formatted: formatHoursToTimeString(val),
      valid: true,
      warning
    };
  }

  // Caso formato relógio com segundos "HH:MM:SS" ou "H:MM:SS" (ex: "02:30:15")
  const clockSecMatch = str.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (clockSecMatch) {
    const h = parseInt(clockSecMatch[1], 10);
    const m = parseInt(clockSecMatch[2], 10);
    const s = parseInt(clockSecMatch[3], 10);
    if (m >= 60 || s >= 60) {
      return { hours: 0, formatted: "0min", valid: false };
    }
    const totalHours = h + m / 60 + s / 3600;
    return { hours: totalHours, formatted: formatHoursToTimeString(totalHours), valid: true };
  }

  // Caso formato relógio "HH:MM" ou "H:MM" (ex: "5:40" ou "01:24")
  const clockMatch = str.match(/^(\d+):(\d{1,2})$/);
  if (clockMatch) {
    const h = parseInt(clockMatch[1], 10);
    const m = parseInt(clockMatch[2], 10);
    if (m >= 60) {
      return { hours: 0, formatted: "0min", valid: false };
    }
    const totalHours = h + m / 60;
    return { hours: totalHours, formatted: formatHoursToTimeString(totalHours), valid: true };
  }

  // Caso compacto "3h30" ou "3h 30" (número + h + minutos sem sufixo min)
  const compactMatch = str.match(/^(\d+)\s*h\s*(\d{1,2})$/i);
  if (compactMatch) {
    const h = parseInt(compactMatch[1], 10);
    const m = parseInt(compactMatch[2], 10);
    if (m < 60) {
      const totalHours = h + m / 60;
      return { hours: totalHours, formatted: formatHoursToTimeString(totalHours), valid: true };
    }
  }

  let totalSeconds = 0;
  let matchedAny = false;

  // 1. Dias: "1d", "2d", "1 dia", "2 dias", "1.5d"
  const daysMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:dias?|d)(?![a-z])/i);
  if (daysMatch) {
    const dVal = parseFloat(daysMatch[1].replace(",", "."));
    totalSeconds += dVal * 86400;
    matchedAny = true;
  }

  // 2. Horas: "3h", "3.5h", "3h30min", "3 horas", "3 hrs"
  const hoursMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:horas?|hrs?|h)(?=[0-9\s]|$|[^a-zA-Z])/i);
  if (hoursMatch) {
    const hVal = parseFloat(hoursMatch[1].replace(",", "."));
    totalSeconds += hVal * 3600;
    matchedAny = true;
  }

  // 3. Minutos: "30min", "30 min", "30m", "30 minutos"
  const minMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:minutos?|mins?|min|m)(?![a-z])/i);
  if (minMatch) {
    const mVal = parseFloat(minMatch[1].replace(",", "."));
    totalSeconds += mVal * 60;
    matchedAny = true;
  }

  // 4. Segundos: "15s", "30seg", "45 segundos", "15 seg", "15 s"
  const secMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:segundos?|segs?|seg|s)(?![a-z])/i);
  if (secMatch) {
    const sVal = parseFloat(secMatch[1].replace(",", "."));
    totalSeconds += sVal;
    matchedAny = true;
  }

  if (!matchedAny) {
    return { hours: 0, formatted: "0min", valid: false };
  }

  const totalHours = totalSeconds / 3600;
  return {
    hours: totalHours,
    formatted: formatHoursToTimeString(totalHours),
    valid: true
  };
}

export function formatHoursToTimeString(decimalHours: number): string {
  if (isNaN(decimalHours) || decimalHours <= 0) return "0min";
  
  const totalSeconds = Math.round(decimalHours * 3600);
  if (totalSeconds === 0) return "0min";
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}
