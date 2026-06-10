export function shortAddress(address) {
  if (!address) return "Connecter";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEventDate(value) {
  if (!value) return "Date a definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function euro(amount) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function ethFromEuros(amount) {
  return ((amount || 0) / 1500).toFixed(amount >= 100 ? 2 : 3);
}

export function makeWallet() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function makeTicketCode(paymentId, index) {
  return `#${paymentId}-${index + 1}`;
}

export function defaultDate(eventId) {
  const date = new Date();
  date.setDate(date.getDate() + 14 + Number(eventId || 0));
  date.setHours(20, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

