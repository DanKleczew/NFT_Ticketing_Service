import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api";
import {
  getSessionClientId,
  loadCategories,
  loadEventMeta,
  saveCategories,
  saveEventMeta,
  setSessionClientId,
} from "./storage";
import {
  defaultDate,
  ethFromEuros,
  euro,
  formatEventDate,
  makeTicketCode,
  makeWallet,
  shortAddress,
} from "./utils";
import "./styles.css";

const DEFAULT_CATEGORY = {
  id: "standard",
  title: "Entree",
  description: "Acces standard a l'evenement",
  price: 15,
  capacity: 100,
};

const DEFAULT_EVENT_FORM = {
  name: "",
  description: "",
  max_supply: 100,
  ticket_price_in_eth: "0.01",
  date: "",
  banner: "rose",
};

const bannerThemes = ["rose", "ink", "amber", "mint", "blue"];

function ethToWeiString(value) {
  const normalized = String(value || "0").trim().replace(",", ".");
  const [whole = "0", fraction = ""] = normalized.split(".");
  const safeWhole = whole.replace(/\D/g, "") || "0";
  const safeFraction = fraction.replace(/\D/g, "").slice(0, 18).padEnd(18, "0");
  return (BigInt(safeWhole) * 10n ** 18n + BigInt(safeFraction || "0")).toString();
}

function App() {
  const [view, setView] = useState("events");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState(loadEventMeta);
  const [categories, setCategories] = useState(loadCategories);
  const [clientId, setClientId] = useState(getSessionClientId);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const currentClient = useMemo(
    () => clients.find((client) => String(client.id) === String(clientId)),
    [clients, clientId],
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId],
  );

  async function refresh() {
    setError("");
    const [nextEvents, nextClients, nextPayments] = await Promise.all([
      api.getEvents(),
      api.getClients(),
      api.getPayments(),
    ]);
    setEvents(nextEvents || []);
    setClients(nextClients || []);
    setPayments(nextPayments || []);
    if (!getSessionClientId() && nextClients?.length) {
      setClientId(nextClients[0].id);
      setSessionClientId(nextClients[0].id);
    }
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function persistMeta(nextMeta) {
    setMeta(nextMeta);
    saveEventMeta(nextMeta);
  }

  function persistCategories(nextCategories) {
    setCategories(nextCategories);
    saveCategories(nextCategories);
  }

  async function ensureClient(form) {
    if (currentClient) return currentClient;
    const wallet = form.wallet_public_key || makeWallet();
    await api.createClient({
      first_name: form.first_name || "Invite",
      last_name: form.last_name || "Ticketing",
      wallet_public_key: wallet,
    });
    await refresh();
    const nextClients = await api.getClients();
    const created = [...(nextClients || [])].reverse().find((client) => client.wallet_public_key === wallet);
    if (created) {
      setClientId(created.id);
      setSessionClientId(created.id);
      setClients(nextClients || []);
      return created;
    }
    throw new Error("Client cree, mais impossible de le retrouver.");
  }

  function openEvent(eventId) {
    setSelectedEventId(eventId);
    setView("event");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreateEvent(payload) {
    await api.createEvent({
      name: payload.name,
      description: payload.description,
      public_contract_id: `front-auto-${Date.now()}`,
      max_supply: Number(payload.max_supply),
      ticket_price_in_eth: ethToWeiString(payload.ticket_price_in_eth),
    });
    const nextEvents = await api.getEvents();
    setEvents(nextEvents || []);
    const created = [...(nextEvents || [])].reverse().find((event) => event.name === payload.name);
    if (created) {
      const nextMeta = {
        ...meta,
        [created.id]: {
          date: payload.date || defaultDate(created.id),
          banner: payload.banner || bannerThemes[created.id % bannerThemes.length],
        },
      };
      const nextCategories = {
        ...categories,
        [created.id]: categories[created.id] || [{ ...DEFAULT_CATEGORY }],
      };
      persistMeta(nextMeta);
      persistCategories(nextCategories);
    }
    setNotice("Evenement cree.");
  }

  async function handleCreateCategory(eventId, payload) {
    const list = categories[eventId] || [{ ...DEFAULT_CATEGORY }];
    const next = {
      ...categories,
      [eventId]: [
        ...list,
        {
          id: `${Date.now()}`,
          title: payload.title,
          description: payload.description,
          price: Number(payload.price),
          capacity: Number(payload.capacity),
        },
      ],
    };
    persistCategories(next);
    setNotice("Categorie ajoutee au catalogue local.");
  }

  async function handleCheckout({ eventId, cart, client }) {
    const buyer = await ensureClient(client);
    const total = Object.values(cart).reduce((sum, line) => sum + line.quantity * line.category.price, 0);
    const ticketsNumber = Object.values(cart).reduce((sum, line) => sum + line.quantity, 0);
    await api.createPayment({ amount: total, ticketsNumber, clientId: buyer.id, eventId });
    await refresh();
    setNotice("Paiement confirme. Vos tickets sont disponibles.");
    setView("tickets");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const enrichedEvents = events.map((event, index) => ({
    ...event,
    meta: meta[event.id] || {
      date: defaultDate(event.id),
      banner: bannerThemes[index % bannerThemes.length],
    },
    categories: categories[event.id] || [{ ...DEFAULT_CATEGORY }],
  }));

  return (
    <div>
      <Header
        view={view}
        setView={setView}
        wallet={currentClient?.wallet_public_key}
        onConnect={() => setView("profile")}
      />
      <main className="shell">
        <StatusBar loading={loading} error={error} notice={notice} clearNotice={() => setNotice("")} />
        {view === "events" && <EventsPage events={enrichedEvents} onOpen={openEvent} />}
        {view === "event" && selectedEvent && (
          <EventPage
            event={{ ...selectedEvent, meta: meta[selectedEvent.id], categories: categories[selectedEvent.id] }}
            payments={payments}
            currentClient={currentClient}
            onCheckout={handleCheckout}
          />
        )}
        {view === "tickets" && (
          <TicketsPage
            events={enrichedEvents}
            payments={payments}
            currentClient={currentClient}
            clients={clients}
            onProfile={() => setView("profile")}
          />
        )}
        {view === "admin" && (
          <AdminPage
            events={enrichedEvents}
            onCreateEvent={handleCreateEvent}
            onCreateCategory={handleCreateCategory}
            apiBase={api.baseUrl}
          />
        )}
        {view === "profile" && (
          <ProfilePage
            clients={clients}
            currentClient={currentClient}
            onSelect={(id) => {
              setClientId(id);
              setSessionClientId(id);
              setView("tickets");
            }}
            onCreate={ensureClient}
          />
        )}
      </main>
    </div>
  );
}

function Header({ view, setView, wallet, onConnect }) {
  const nav = [
    ["events", "Events"],
    ["tickets", "My tickets"],
    ["admin", "Admin"],
  ];
  return (
    <header className="topbar">
      <div className="nav-inner">
        <button className="brand" onClick={() => setView("events")}>
          <span className="brand-mark">T</span>
          <span>TICKETING</span>
        </button>
        <nav>
          {nav.map(([key, label]) => (
            <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="wallet" onClick={onConnect}>{shortAddress(wallet)}</button>
      </div>
    </header>
  );
}

function StatusBar({ loading, error, notice, clearNotice }) {
  if (loading) return <div className="status">Chargement des donnees FastAPI...</div>;
  if (error) return <div className="status error">API indisponible: {error}</div>;
  if (notice) return <button className="status success" onClick={clearNotice}>{notice}</button>;
  return null;
}

function EventsPage({ events, onOpen }) {
  return (
    <section>
      <PageTitle title="EVENTS" subtitle={`${events.length} evenement${events.length > 1 ? "s" : ""} disponible${events.length > 1 ? "s" : ""}`} />
      {events.length === 0 ? (
        <EmptyState title="Aucun evenement" text="Creez votre premier evenement depuis l'admin." />
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <article className="event-card" key={event.id}>
              <EventBanner theme={event.meta.banner} title={event.name} />
              <div className="event-card-body">
                <p className="date">{formatEventDate(event.meta.date)}</p>
                <h2>{event.name}</h2>
                <p>{event.description}</p>
                <div className="card-footer">
                  <span>des {ethFromEuros(minPrice(event.categories))} ETH</span>
                  <button className="btn primary" onClick={() => onOpen(event.id)}>Voir billets</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EventPage({ event, payments, currentClient, onCheckout }) {
  const eventCategories = event.categories?.length ? event.categories : [{ ...DEFAULT_CATEGORY }];
  const [cart, setCart] = useState({});
  const [checkoutMode, setCheckoutMode] = useState("card");
  const [client, setClient] = useState({
    first_name: currentClient?.first_name || "",
    last_name: currentClient?.last_name || "",
    wallet_public_key: currentClient?.wallet_public_key || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkoutLog, setCheckoutLog] = useState(null);
  const totals = cartTotals(cart);

  useEffect(() => {
    setCart({});
    setCheckoutLog(null);
  }, [event.id]);

  function updateQuantity(category, delta) {
    setCart((prev) => {
      const current = prev[category.id]?.quantity || 0;
      const quantity = Math.max(0, Math.min(8, current + delta));
      const next = { ...prev };
      if (quantity === 0) delete next[category.id];
      else next[category.id] = { category, quantity };
      return next;
    });
  }

  async function submit() {
    setCheckoutLog({
      type: "pending",
      text: `Validation de ${totals.quantity} ticket${totals.quantity > 1 ? "s" : ""} pour ${ethFromEuros(totals.amount)} ETH...`,
    });
    setSubmitting(true);
    try {
      await onCheckout({ eventId: event.id, cart, client });
      setCheckoutLog({ type: "success", text: "Paiement confirme. Mint des tickets demande au back." });
    } catch (err) {
      setCheckoutLog({ type: "error", text: `Achat echoue: ${err.message || "erreur inconnue"}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="event-detail">
      <EventBanner theme={event.meta?.banner || "rose"} title={event.name} wide />
      <div className="event-heading">
        <h1>{event.name}</h1>
        <p>{event.description}</p>
        <span>{formatEventDate(event.meta?.date)}</span>
      </div>
      <div className="panel tickets-panel">
        <div className="panel-head">
          <h2>TICKETS</h2>
          <div>
            <span>starting at</span>
            <strong>{ethFromEuros(minPrice(eventCategories))} ETH</strong>
          </div>
        </div>
        {eventCategories.map((category) => {
          const sold = payments
            .filter((payment) => payment.event_id === event.id)
            .reduce((sum, payment) => sum + Number(payment.tickets_number || 1), 0);
          const left = Math.max(0, Number(category.capacity || 0) - sold);
          return (
            <div className="ticket-row" key={category.id}>
              <div>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <span>{left} left</span>
              </div>
              <div className="quantity">
                <strong>{ethFromEuros(category.price)} ETH</strong>
                <div>
                  <button onClick={() => updateQuantity(category, -1)} disabled={!cart[category.id]}>-</button>
                  <span>{cart[category.id]?.quantity || 0}</span>
                  <button onClick={() => updateQuantity(category, 1)} disabled={left === 0}>+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {totals.quantity > 0 && (
        <div className="panel checkout-panel">
          <h2>CHECKOUT - {totals.quantity} ticket{totals.quantity > 1 ? "s" : ""}, {ethFromEuros(totals.amount)} ETH</h2>
          {!currentClient && (
            <div className="buyer-grid">
              <input placeholder="Prenom" value={client.first_name} onChange={(e) => setClient({ ...client, first_name: e.target.value })} />
              <input placeholder="Nom" value={client.last_name} onChange={(e) => setClient({ ...client, last_name: e.target.value })} />
              <input placeholder="Wallet public key (optionnel)" value={client.wallet_public_key} onChange={(e) => setClient({ ...client, wallet_public_key: e.target.value })} />
            </div>
          )}
          <div className="payment-options">
            <button className={checkoutMode === "card" ? "selected" : ""} onClick={() => setCheckoutMode("card")}>
              <strong>Card payment</strong>
              <span>Pay by card, the platform mints for you</span>
            </button>
            <button className={checkoutMode === "wallet" ? "selected" : ""} onClick={() => setCheckoutMode("wallet")}>
              <strong>Pay with wallet</strong>
              <span>Buy on-chain for {ethFromEuros(totals.amount)} ETH</span>
            </button>
          </div>
          <button className="btn full" onClick={submit} disabled={submitting}>
            {submitting ? "Validation..." : checkoutMode === "card" ? "Simulate card payment" : "Confirm wallet payment"}
          </button>
          {checkoutLog && (
            <div className={`status checkout-log ${checkoutLog.type === "error" ? "error" : "success"}`}>
              {checkoutLog.text}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TicketsPage({ events, payments, currentClient, clients, onProfile }) {
  if (!currentClient) {
    return (
      <section>
        <PageTitle title="MY TICKETS" />
        <EmptyState title="Aucun profil selectionne" text="Connectez un client pour afficher ses billets." action={<button className="btn primary" onClick={onProfile}>Choisir un profil</button>} />
      </section>
    );
  }

  const myPayments = payments.filter((payment) => String(payment.client_id) === String(currentClient.id));

  return (
    <section>
      <PageTitle title="MY TICKETS" subtitle={`${currentClient.first_name} ${currentClient.last_name} - ${shortAddress(currentClient.wallet_public_key)}`} />
      {myPayments.length === 0 ? (
        <EmptyState title="Aucun ticket" text="Achetez un billet depuis la page Events." />
      ) : (
        <div className="ticket-list">
          {myPayments.map((payment) => {
            const event = events.find((item) => item.id === payment.event_id);
            const buyer = clients.find((client) => client.id === payment.client_id);
            return (
              <article className="ticket-card" key={payment.id}>
                <MiniTicket title={event?.name || "Event"} code={makeTicketCode(payment.id, 0)} />
                <div>
                  <h2>{event?.name || `Event #${payment.event_id}`}</h2>
                  <p>{buyer?.wallet_public_key || currentClient.wallet_public_key}</p>
                  <div className="chips">
                    <span>{makeTicketCode(payment.id, 0)}</span>
                    <span>{euro(payment.amount)}</span>
                  </div>
                </div>
                <time>{formatEventDate(event?.meta?.date)}</time>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AdminPage({ events, onCreateEvent, onCreateCategory, apiBase }) {
  const [eventForm, setEventForm] = useState(DEFAULT_EVENT_FORM);
  const [categoryForm, setCategoryForm] = useState({ eventId: "", title: "", description: "", price: 15, capacity: 100 });
  const [eventLog, setEventLog] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submitEvent(e) {
    e.preventDefault();
    setEventLog({ type: "pending", text: `Creation de l'evenement "${eventForm.name}" en cours...` });
    setBusy(true);
    try {
      await onCreateEvent(eventForm);
      setEventLog({ type: "success", text: `Evenement "${eventForm.name}" cree avec succes.` });
      setEventForm(DEFAULT_EVENT_FORM);
    } catch (err) {
      setEventLog({ type: "error", text: `Creation echouee: ${err.message || "erreur inconnue"}` });
    } finally {
      setBusy(false);
    }
  }

  async function submitCategory(e) {
    e.preventDefault();
    if (!categoryForm.eventId) return;
    await onCreateCategory(categoryForm.eventId, categoryForm);
    setCategoryForm({ eventId: categoryForm.eventId, title: "", description: "", price: 15, capacity: 100 });
  }

  return (
    <section>
      <PageTitle title="ADMIN" subtitle={`API: ${apiBase}`} />
      <form className="panel form-panel" onSubmit={submitEvent}>
        <h2>NEW EVENT</h2>
        <input required placeholder="Title" value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} />
        <textarea required placeholder="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
        <div className="buyer-grid">
          <input required type="number" min="1" placeholder="Max supply" value={eventForm.max_supply} onChange={(e) => setEventForm({ ...eventForm, max_supply: e.target.value })} />
          <input required type="number" min="0" step="0.001" placeholder="Ticket price in ETH" value={eventForm.ticket_price_in_eth} onChange={(e) => setEventForm({ ...eventForm, ticket_price_in_eth: e.target.value })} />
        </div>
        <input type="datetime-local" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
        <div className="swatches">
          {bannerThemes.map((theme) => (
            <button
              type="button"
              key={theme}
              className={`swatch ${theme} ${eventForm.banner === theme ? "selected" : ""}`}
              onClick={() => setEventForm({ ...eventForm, banner: theme })}
              aria-label={`Theme ${theme}`}
            />
          ))}
        </div>
        <button className="btn primary" disabled={busy}>{busy ? "Creation..." : "Create event"}</button>
        {eventLog && (
          <div className={`status event-log ${eventLog.type === "error" ? "error" : "success"}`}>
            {eventLog.text}
          </div>
        )}
      </form>
      <form className="panel form-panel" onSubmit={submitCategory}>
        <h2>NEW TICKET CATEGORY</h2>
        <p>Les categories enrichissent l'UX locale. Le paiement final utilise l'endpoint FastAPI `/payment`.</p>
        <select required value={categoryForm.eventId} onChange={(e) => setCategoryForm({ ...categoryForm, eventId: e.target.value })}>
          <option value="">Select an event...</option>
          {events.map((event) => (
            <option value={event.id} key={event.id}>{event.name}</option>
          ))}
        </select>
        <input required placeholder="Title (e.g. VIP)" value={categoryForm.title} onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })} />
        <textarea placeholder="Description" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
        <div className="buyer-grid">
          <input type="number" min="1" placeholder="Price EUR" value={categoryForm.price} onChange={(e) => setCategoryForm({ ...categoryForm, price: e.target.value })} />
          <input type="number" min="1" placeholder="Capacity" value={categoryForm.capacity} onChange={(e) => setCategoryForm({ ...categoryForm, capacity: e.target.value })} />
        </div>
        <button className="btn primary">Create category</button>
      </form>
    </section>
  );
}

function ProfilePage({ clients, currentClient, onSelect, onCreate }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", wallet_public_key: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const client = await onCreate(form);
      onSelect(client.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <PageTitle title="PROFILE" subtitle={currentClient ? shortAddress(currentClient.wallet_public_key) : "Connecter un client"} />
      <div className="profile-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <h2>NEW CLIENT</h2>
          <input required placeholder="Prenom" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <input required placeholder="Nom" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <input placeholder="Wallet public key" value={form.wallet_public_key} onChange={(e) => setForm({ ...form, wallet_public_key: e.target.value })} />
          <button className="btn primary" disabled={busy}>{busy ? "Creation..." : "Create client"}</button>
        </form>
        <div className="panel client-list">
          <h2>CLIENTS</h2>
          {clients.map((client) => (
            <button key={client.id} onClick={() => onSelect(client.id)} className={currentClient?.id === client.id ? "selected" : ""}>
              <strong>{client.first_name} {client.last_name}</strong>
              <span>{shortAddress(client.wallet_public_key)}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

function EventBanner({ theme, title, wide }) {
  return (
    <div className={`banner ${theme || "rose"} ${wide ? "wide" : ""}`}>
      <div className="banner-noise" />
      <span>{title}</span>
    </div>
  );
}

function MiniTicket({ title, code }) {
  return (
    <div className="mini-ticket">
      <strong>{title.slice(0, 10)}</strong>
      <span>STANDARD</span>
      <small>{code}</small>
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

function minPrice(categories) {
  return Math.min(...(categories?.length ? categories : [DEFAULT_CATEGORY]).map((category) => Number(category.price || 0)));
}

function cartTotals(cart) {
  return Object.values(cart).reduce(
    (totals, line) => ({
      quantity: totals.quantity + line.quantity,
      amount: totals.amount + line.quantity * Number(line.category.price || 0),
    }),
    { quantity: 0, amount: 0 },
  );
}

createRoot(document.getElementById("root")).render(<App />);
