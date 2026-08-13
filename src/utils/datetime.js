function parseServerDate(iso) {
  if (!iso) return null;
  let s = iso;
  if (!/Z$|[+-]\d\d:\d\d$/.test(s)) s += "Z";
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDateTime(iso) {
  const d = parseServerDate(iso);
  if (!d) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtTime(iso) {
  const d = parseServerDate(iso);
  if (!d) return "";
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
