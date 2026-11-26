export function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatShortDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export function formatNumber(n: number, digits = 1) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function today() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
