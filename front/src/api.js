const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

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
      message = typeof body === "string" ? body : body.detail || message;
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
  createPayment: ({ amount, clientId, eventId }) => {
    const params = new URLSearchParams({
      amount: String(amount),
      client_id: String(clientId),
      event_id: String(eventId),
    });
    return request(`/payment?${params.toString()}`, { method: "POST" });
  },
};
