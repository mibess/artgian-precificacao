/**
 * Utilitários para conversão flexível de strings de tempo em horas decimais e vice-versa.
 * Suporta: "1.4 h", "1.4h", "2.3h", "45 min", "5h40min", "5h 40m", "7h15", "2h", "25min", "05:40", "340min"
 */

export function parseTimeToHours(input: string | number): { hours: number; formatted: string } {
  if (typeof input === "number") {
    const val = isNaN(input) ? 0 : Math.max(0, input);
    return {
      hours: val,
      formatted: formatHoursToTimeString(val)
    };
  }

  const str = (input || "").trim().toLowerCase();
  if (!str) return { hours: 0, formatted: "0min" };

  // Caso: apenas número decimal direto (ex: "1.4" ou "5.5")
  if (/^\d+([.,]\d+)?$/.test(str)) {
    const val = parseFloat(str.replace(",", "."));
    return { hours: val, formatted: formatHoursToTimeString(val) };
  }

  // Caso formato relógio "HH:MM" ou "H:MM" (ex: "5:40" ou "01:24")
  const clockMatch = str.match(/^(\d+):(\d{1,2})$/);
  if (clockMatch) {
    const h = parseInt(clockMatch[1], 10);
    const m = parseInt(clockMatch[2], 10);
    const totalHours = h + m / 60;
    return { hours: totalHours, formatted: formatHoursToTimeString(totalHours) };
  }

  // Extrair horas e minutos com regex rigoroso usando word boundary (\b)
  // para NUNCA confundir "A1 mini" com "min"!
  let totalMinutes = 0;
  let hasFound = false;

  // Horas decimais ou inteiras: "1.4 h", "1.4h", "5h", "2 horas", "2.5 hrs"
  const hoursMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:h\b|hr\b|hrs\b|hora\b|horas\b)/i);
  if (hoursMatch) {
    const hVal = parseFloat(hoursMatch[1].replace(",", "."));
    totalMinutes += hVal * 60;
    hasFound = true;
  }

  // Minutos: "45 min", "45m", "40 minutos" (cuidado: word boundary impede casar "mini")
  const minMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:minutos?\b|mins?\b|m\b)(?!ini)/i);
  if (minMatch) {
    const mVal = parseFloat(minMatch[1].replace(",", "."));
    totalMinutes += mVal;
    hasFound = true;
  }

  // Caso compacto: "5h40" (sem sufixo min)
  if (!hasFound) {
    const compactMatch = str.match(/^(\d+)h(\d+)$/i);
    if (compactMatch) {
      totalMinutes = parseInt(compactMatch[1], 10) * 60 + parseInt(compactMatch[2], 10);
      hasFound = true;
    }
  }

  // Fallback: número puro seguido de min
  if (!hasFound) {
    const pureMinMatch = str.match(/^(\d+)\s*m$/i);
    if (pureMinMatch) {
      totalMinutes = parseInt(pureMinMatch[1], 10);
      hasFound = true;
    }
  }

  const totalHours = totalMinutes / 60;
  return {
    hours: totalHours,
    formatted: formatHoursToTimeString(totalHours)
  };
}

export function formatHoursToTimeString(decimalHours: number): string {
  if (isNaN(decimalHours) || decimalHours <= 0) return "0min";
  
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}
