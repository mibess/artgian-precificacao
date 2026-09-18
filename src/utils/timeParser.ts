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

  // Caso compacto "3h30" ou "3h 30" (número + h + minutos sem sufixo min)
  const compactMatch = str.match(/^(\d+)\s*h\s*(\d{1,2})$/i);
  if (compactMatch) {
    const h = parseInt(compactMatch[1], 10);
    const m = parseInt(compactMatch[2], 10);
    const totalHours = h + m / 60;
    return { hours: totalHours, formatted: formatHoursToTimeString(totalHours) };
  }

  let totalMinutes = 0;
  let hasFound = false;

  // 1. Horas: "3h", "3.5h", "3h30min", "3 horas", "3 hrs"
  // Não usa \b após 'h' para não quebrar quando seguido diretamente por dígito como em "3h30min"
  const hoursMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:horas?|hrs?|h)(?=[0-9\s]|$|[^a-zA-Z])/i);
  if (hoursMatch) {
    const hVal = parseFloat(hoursMatch[1].replace(",", "."));
    totalMinutes += hVal * 60;
    hasFound = true;
  }

  // 2. Minutos: "30min", "30 min", "30m", "30 minutos"
  const minMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:minutos?|mins?|min|m)(?![a-z])/i);
  if (minMatch) {
    const mVal = parseFloat(minMatch[1].replace(",", "."));
    totalMinutes += mVal;
    hasFound = true;
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
