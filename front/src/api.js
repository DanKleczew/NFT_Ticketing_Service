const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function formatApiErrorDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(".") : "";
        const message = item.msg || item.message || JSON.stringify(item);
        return field ? `${field}: ${message}` : message;
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return "";
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Erreur API ${response.status}`;
    try {
      const body = await response.json();
      message = typeof body === "string" ? body : formatApiErrorDetail(body.detail) || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  baseUrl: API_BASE,
  getEvents: () => request("/event"),
  getEvent: (eventId) => request(`/event/${eventId}`),
  createEvent: (payload) =>
    request("/event", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getClients: () => request("/client"),
  createClient: (payload) =>
    request("/client", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPayments: () => request("/payment"),
  createPayment: ({ amount, clientId, eventId, ticketsNumber }) => {
    const params = new URLSearchParams({
      amount: String(amount),
      tickets_number: String(ticketsNumber),
      client_id: String(clientId),
      event_id: String(eventId),
    });
    return request(`/payment?${params.toString()}`, { method: "POST" });
  },
};
