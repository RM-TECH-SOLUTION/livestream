/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import template1Mobile from "./assets/Template1Mobile.png";
import template1Web from "./assets/Template1Web.png";
import template2 from "./assets/Template2.jpeg";
import template3 from "./assets/Template3.jpg";
import template4 from "./assets/Template4.png";

const API_BASE_URL = "https://api.rmtechsolution.com";
const THUMBNAIL_BASE_URL = `${API_BASE_URL}/uploads/thumbnails`;

const templateOptions = [
  { key: "template1", label: "Template 1", webPreview: template1Web, mobilePreview: template1Mobile },
  { key: "template2", label: "Template 2", webPreview: template2, mobilePreview: template2 },
  { key: "template3", label: "Template 3", webPreview: template3, mobilePreview: template3 },
  { key: "template4", label: "Template 4", webPreview: template4, mobilePreview: template4 }
];

const fontFamilyOptions = [
  { key: "montserrat", label: "Montserrat", family: '"Montserrat", "Manrope", sans-serif' },
  { key: "manrope", label: "Manrope", family: '"Manrope", "Segoe UI", sans-serif' },
  { key: "syne", label: "Syne", family: '"Syne", "Manrope", sans-serif' },
  { key: "georgia", label: "Georgia", family: 'Georgia, "Times New Roman", serif' },
  { key: "trebuchet", label: "Trebuchet", family: '"Trebuchet MS", "Segoe UI", sans-serif' }
];

const liveTemplateAssets = {
  "Template 1": { hero: template1Web, mobileHero: template1Mobile, themeClass: "template-one" },
  "Template 2": { hero: template2, mobileHero: template2, themeClass: "template-two" },
  "Template 3": { hero: template3, mobileHero: template3, themeClass: "template-three" },
  "Template 4": { hero: template4, mobileHero: template4, themeClass: "template-four" }
};

const initialFormState = {
  title: "",
  subtitle: "",
  eventUrl: "eventurlname2024",
  selectedTemplate: templateOptions[0].key,
  eventDate: "",
  eventHour: "01",
  eventMinute: "00",
  meridiem: "AM",
  selectedFontFamily: fontFamilyOptions[0].key,
  thumbnailFile: null,
  thumbnailUrl: "",
  clientName: ""
};

const initialEventFilters = {
  dateFrom: "",
  dateTo: "",
  search: "",
  quickFilter: ""
};

function slugify(value) {
  return String(value || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "event";
}

function getEventRoute(eventId, eventName) {
  return `/${eventId}/${slugify(eventName)}`;
}

function getRouteEventId(pathname) {
  const match = pathname.match(/^\/(\d+)(?:\/[^/]+)?\/?$/);
  return match ? match[1] : null;
}

function getTemplateLiveAssets(templateLabel) {
  return liveTemplateAssets[templateLabel] || liveTemplateAssets["Template 1"];
}

function getEmbedUrl(eventUrl) {
  if (!eventUrl) {
    return "";
  }

  try {
    const parsed = new URL(eventUrl);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : eventUrl;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace(/^\//, "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : eventUrl;
    }

    return eventUrl;
  } catch {
    return eventUrl;
  }
}

function formatEventDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const value = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(value.getTime())) {
    return dateString;
  }

  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function formatEventTime(timeString) {
  if (!timeString) {
    return "-";
  }

  const [rawHour = "0", rawMinute = "00"] = timeString.split(":");
  const parsedHour = Number.parseInt(rawHour, 10);

  if (Number.isNaN(parsedHour)) {
    return timeString;
  }

  const meridiem = parsedHour >= 12 ? "PM" : "AM";
  const hour12 = parsedHour % 12 || 12;

  return `${String(hour12).padStart(2, "0")}:${rawMinute} ${meridiem}`;
}

function parseTimeForForm(timeString) {
  const [rawHour = "01", rawMinute = "00"] = (timeString || "01:00:00").split(":");
  const parsedHour = Number.parseInt(rawHour, 10);

  if (Number.isNaN(parsedHour)) {
    return {
      eventHour: "01",
      eventMinute: "00",
      meridiem: "AM"
    };
  }

  return {
    eventHour: String(parsedHour % 12 || 12).padStart(2, "0"),
    eventMinute: rawMinute.padStart(2, "0"),
    meridiem: parsedHour >= 12 ? "PM" : "AM"
  };
}

function to24HourTime(eventHour, eventMinute, meridiem) {
  const parsedHour = Number.parseInt(eventHour || "0", 10);
  const safeHour = Number.isNaN(parsedHour) ? 0 : parsedHour % 12;
  const hour24 = meridiem === "PM" ? safeHour + 12 : safeHour;

  return `${String(hour24).padStart(2, "0")}:${String(eventMinute || "00").padStart(2, "0")}:00`;
}

function normalizeEvent(event, currentUser) {
  const templateKey = templateOptions.find((item) => item.label === event.template)?.key ?? templateOptions[0].key;
  const fontKey = fontFamilyOptions.find((item) => item.label === event.font_family)?.key ?? fontFamilyOptions[1].key;
  const timeParts = parseTimeForForm(event.event_time);

  const thumbnailUrl = event.thumbnail
    ? event.thumbnail.startsWith("http")
      ? event.thumbnail
      : `${THUMBNAIL_BASE_URL}/${event.thumbnail}`
    : "";

  return {
    apiId: event.id,
    id: String(event.id),
    title: event.title ?? "",
    subtitle: event.subtitle ?? "",
    eventUrl: event.event_url ?? "",
    selectedTemplate: templateKey,
    eventDate: event.event_date ?? "",
    eventHour: timeParts.eventHour,
    eventMinute: timeParts.eventMinute,
    meridiem: timeParts.meridiem,
    selectedFontFamily: fontKey,
    thumbnailUrl,
    clientName: event.client_name ?? "",
    date: formatEventDate(event.event_date),
    time: formatEventTime(event.event_time),
    name: event.client_name ?? "-",
    createdBy: currentUser || "Live Streaming"
  };
}

async function requestApi(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/${path}`, options);
  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text);
    }
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

async function fetchLiveEventById(eventId) {
  try {
    const formData = new FormData();
    formData.append("id", String(eventId));
    const data = await requestApi("fetchLiveEvent.php", {
      method: "POST",
      body: formData
    });
    return Array.isArray(data.data) ? data.data[0] : data.data || data.event || data;
  } catch {
    const data = await requestApi(`fetchLiveEvent.php?id=${encodeURIComponent(eventId)}`);
    return Array.isArray(data.data) ? data.data[0] : data.data || data.event || data;
  }
}

function buildEventFormData(formState, editingEventId) {
  const formData = new FormData();
  const selectedTemplate = templateOptions.find((item) => item.key === formState.selectedTemplate) ?? templateOptions[0];
  const selectedFontFamily = fontFamilyOptions.find((item) => item.key === formState.selectedFontFamily) ?? fontFamilyOptions[0];

  formData.append("title", formState.title.trim());
  formData.append("subtitle", formState.subtitle.trim());
  formData.append("event_url", formState.eventUrl.trim());
  formData.append("template", selectedTemplate.label);
  formData.append("event_date", formState.eventDate);
  formData.append("event_time", to24HourTime(formState.eventHour, formState.eventMinute, formState.meridiem));
  formData.append("font_family", selectedFontFamily.label);
  formData.append("client_name", formState.clientName.trim());

  if (editingEventId != null) {
    formData.append("id", String(editingEventId));
  }

  if (formState.thumbnailFile) {
    formData.append("thumbnail", formState.thumbnailFile);
  }

  return formData;
}

function Sidebar({ active, onSelect, username, mobileNavOpen, onToggleMobileNav }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">📹</div>
          <div>
            <p className="brand-title">Live Streaming</p>
          </div>
        </div>
        <button type="button" className="mobile-nav-toggle" onClick={onToggleMobileNav}>Menu</button>
      </div>

      <nav className={`menu ${mobileNavOpen ? "open" : ""}`}>
        {[
          ["dashboard", "Dashboard"],
          ["events", "Events"],
          ["create", "Create Event"]
        ].map(([key, label]) => (
          <button
            key={key}
            className={`menu-item ${active === key ? "active" : ""}`}
            onClick={() => onSelect(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="profile-card">
        <p className="profile-avatar">👤</p>
        <p className="profile-name">{username}</p>
        <p className="profile-role">User</p>
      </div>
    </aside>
  );
}

function DashboardSection({ rows, isLoading, errorMessage, onEditClick, onPreviewClick }) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);

    return [
      [String(rows.length), "Total Events", "#5b6ee1"],
      [String(rows.filter((row) => row.eventDate === today).length), "Today Events", "#17a04b"],
      [String(rows.filter((row) => row.eventDate === tomorrow).length), "Tomorrow Events", "#ffb100"],
      [String(rows.filter((row) => row.eventDate > tomorrow).length), "Upcoming Events", "#0b78f2"]
    ];
  }, [rows]);

  return (
    <section>
      <div className="header-card"><h2>Dashboard</h2></div>
      <div className="stats-grid">
        {stats.map(([number, label, color]) => (
          <article className="stat-card" key={label}>
            <p className="stat-number" style={{ color }}>{number}</p>
            <p className="stat-label">{label}</p>
          </article>
        ))}
      </div>
      <div className="table-card">
        <h3>Recent Events</h3>
        <EventsTable
          rows={rows.slice(0, 5)}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onEditClick={onEditClick}
          onPreviewClick={onPreviewClick}
          emptyMessage="No live events found."
        />
      </div>
    </section>
  );
}

function EventsTable({ rows, isLoading, errorMessage, onEditClick, onPreviewClick, emptyMessage }) {
  if (isLoading) {
    return <p className="status-message">Loading live events...</p>;
  }

  if (errorMessage) {
    return <p className="status-message error">{errorMessage}</p>;
  }

  if (!rows.length) {
    return <p className="status-message">{emptyMessage}</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Event Id</th>
            <th>Title</th>
            <th>Date</th>
            <th>Time</th>
            <th>Name</th>
            <th>Created By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Event Id">{row.id}</td>
              <td data-label="Title" className="bold-cell">{row.title}</td>
              <td data-label="Date">{row.date}</td>
              <td data-label="Time">{row.time}</td>
              <td data-label="Name">{row.name}</td>
              <td data-label="Created By"><span className="tag">{row.createdBy}</span></td>
              <td data-label="Actions">
                <div className="actions">
                  <button type="button" onClick={() => onEditClick(row)}>✎</button>
                  <button type="button" onClick={() => onPreviewClick(row)}>🖼</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveEventPage({ eventId, onBackToApp }) {
  const [eventDetails, setEventDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth <= 760);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 760);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadEvent = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchLiveEventById(eventId);

        if (!data) {
          throw new Error("Live event not found.");
        }

        if (isMounted) {
          setEventDetails(data);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the live event.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const resolvedThumbnail = eventDetails?.thumbnail
    ? eventDetails.thumbnail.startsWith("http")
      ? eventDetails.thumbnail
      : `${THUMBNAIL_BASE_URL}/${eventDetails.thumbnail}`
    : "";
  const templateAssets = getTemplateLiveAssets(eventDetails?.template);
  const eventEmbedUrl = getEmbedUrl(eventDetails?.event_url);
  const backgroundHero = eventDetails?.template === "Template 1" && isMobileViewport
    ? templateAssets.mobileHero
    : templateAssets.hero;


  const handleWhatsAppShare = useCallback(() => {
    if (!eventDetails) return;

    const title = eventDetails.title || "Live Event";
    const date = formatEventDate(eventDetails.event_date);
    const time = formatEventTime(eventDetails.event_time);
    const url = window.location.href || `${window.location.origin}${getEventRoute(eventDetails.id ?? eventDetails.apiId ?? "", title)}`;

    // Construct the share message (title, date/time and URL)
    const message = `${title}\n${date} ${time}\n${url}`;
    const encoded = encodeURIComponent(message);
    const shareUrl = `https://wa.me/?text=${encoded}`;

    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, [eventDetails]);

  return (
    <main
      className={`event-page ${templateAssets.themeClass}`}
      style={{
        "--event-bg-image": `url(${backgroundHero})`,
        backgroundImage: `url(${backgroundHero})`,
        backgroundSize: "cover",
        backgroundPosition: "center right",
        backgroundRepeat: "no-repeat"
      }}
    >
      {isLoading ? (
        <div className="event-page-status">
          <p className="status-message">Loading live event...</p>
        </div>
      ) : null}
      {errorMessage ? (
        <div className="event-page-status">
          <p className="status-message error">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && eventDetails ? (
        <>
          <div className="event-live-header">
            <h1
              className="event-page-title"
              style={{ fontFamily: eventDetails.font_family || '"Manrope", sans-serif' }}
            >
              {eventDetails.title}
            </h1>
            <div className="share-actions">
              <button type="button" className="whatsapp-share" onClick={handleWhatsAppShare} aria-label="Share on WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M20.52 3.48A11.88 11.88 0 0012 0C5.37 0 .05 5.32.05 11.95a11.58 11.58 0 001.64 5.73L0 24l6.6-1.73A11.9 11.9 0 0012 23.9c6.62 0 12-5.32 12-11.95 0-3.19-1.24-6.19-3.48-8.47z" fill="#25D366"/>
                  <path d="M17.6 14.2c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.36.22-.66.07-.3-.15-1.28-.47-2.44-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.61.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2 0-.36-.02-.51-.03-.15-.68-1.64-.93-2.24-.24-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.52.07-.8.36-.28.3-1.06 1.03-1.06 2.5 0 1.47 1.09 2.9 1.24 3.1.15.2 2.14 3.35 5.18 4.69 3.04 1.35 3.04.9 3.58.84.54-.07 1.78-.72 2.03-1.41.25-.7.25-1.3.18-1.41-.07-.12-.28-.18-.58-.33z" fill="#fff"/>
                </svg>
                <span>Share</span>
              </button>
            </div>
            
            {eventDetails.subtitle ? <p className="event-page-subtitle">{eventDetails.subtitle}</p> : null}
            <p className="event-page-datetime">
              {formatEventDate(eventDetails.event_date)} from {formatEventTime(eventDetails.event_time)},
            </p>
          </div>

          <div className="event-page-layout">
            <div className="event-page-copy">
              {eventEmbedUrl ? (
                <div className="event-video-frame">
                  <iframe
                    src={eventEmbedUrl}
                    title={eventDetails.title || "Live Event"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </div>

            {/* <div className="event-page-media template-artwork-panel">
              <img
                src={displayImage}
                alt={eventDetails.title || "Live event artwork"}
                className="event-page-image"
              />
            </div> */}
          </div>
        </>
      ) : null}
    </main>
  );
}

function EventsSection({
  rows,
  isLoading,
  errorMessage,
  filters,
  hasActiveFilters,
  onFilterChange,
  onQuickFilterChange,
  onResetFilters,
  onCreateClick,
  onEditClick,
  onPreviewClick
}) {
  const emptyMessage = hasActiveFilters ? "No live events match the selected filters." : "No live events available yet.";

  return (
    <section>
      <div className="header-card"><h2>Events Management</h2></div>

      <div className="filter-card">
        <div className="filter-grid">
          <label>Date From<input type="date" value={filters.dateFrom} onChange={(event) => onFilterChange("dateFrom", event.target.value)} /></label>
          <label>Date To<input type="date" value={filters.dateTo} onChange={(event) => onFilterChange("dateTo", event.target.value)} /></label>
          <div>
            <p className="quick-filter">Quick Date Filters</p>
            <div className="chips">
              {[
                ["today", "Today"],
                ["tomorrow", "Tomorrow"],
                ["upcoming", "Upcoming"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={filters.quickFilter === key ? "active" : ""}
                  onClick={() => onQuickFilterChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label>
          Search
          <input
            value={filters.search}
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder="Search by Title, Subtitle, Client, URL, Event ID"
          />
        </label>
        <button type="button" className="primary-btn" onClick={onResetFilters}>{hasActiveFilters ? "Reset Filters" : "All Events"}</button>
      </div>

      <div className="table-card">
        <div className="title-row">
          <h3>Events List</h3>
          <button className="create-btn" type="button" onClick={onCreateClick}>+ Create New Event</button>
        </div>
        <EventsTable
          rows={rows}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onEditClick={onEditClick}
          onPreviewClick={onPreviewClick}
          emptyMessage={emptyMessage}
        />
      </div>
    </section>
  );
}

function CreateSection({
  formState,
  editingEventId,
  isSubmitting,
  submitError,
  submitSuccess,
  onFieldChange,
  onThumbnailChange,
  onSubmit,
  onCancelEdit
}) {
  const activeTemplate = templateOptions.find((item) => item.key === formState.selectedTemplate) ?? templateOptions[0];
  const selectedFontFamily = fontFamilyOptions.find((item) => item.key === formState.selectedFontFamily) ?? fontFamilyOptions[0];

  return (
    <section>
      <div className="header-card"><h2>{editingEventId ? "Update Live Event" : "Create New Event"}</h2></div>
      <form className="create-form" onSubmit={onSubmit}>
        <h3>Basic Information</h3>
        <div className="grid two">
          <label>Title *<input value={formState.title} onChange={(event) => onFieldChange("title", event.target.value)} required /></label>
          <label>Subtitle<input value={formState.subtitle} onChange={(event) => onFieldChange("subtitle", event.target.value)} /></label>
          <label>URL *<input value={formState.eventUrl} onChange={(event) => onFieldChange("eventUrl", event.target.value)} required /></label>
          <label>
            Template
            <select value={formState.selectedTemplate} onChange={(event) => onFieldChange("selectedTemplate", event.target.value)}>
              {templateOptions.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
            <div className="template-thumb" aria-label="Selected template preview">
              <img src={activeTemplate.webPreview} alt={`${activeTemplate.label} thumbnail`} className="template-thumb-image" />
            </div>
          </label>
          <label>Date *<input type="date" value={formState.eventDate} onChange={(event) => onFieldChange("eventDate", event.target.value)} required /></label>
          <label>Time *
            <div className="time-row">
              <input value={formState.eventHour} onChange={(event) => onFieldChange("eventHour", event.target.value.replace(/\D/g, "").slice(0, 2))} />
              <input value={formState.eventMinute} onChange={(event) => onFieldChange("eventMinute", event.target.value.replace(/\D/g, "").slice(0, 2))} />
              <select value={formState.meridiem} onChange={(event) => onFieldChange("meridiem", event.target.value)}><option>AM</option><option>PM</option></select>
            </div>
          </label>
        </div>

        <div className="font-style-section">
          <p className="font-style-title">Font Family</p>
          <label className="font-family-select-label">
            Choose Font Family
            <select value={formState.selectedFontFamily} onChange={(event) => onFieldChange("selectedFontFamily", event.target.value)}>
              {fontFamilyOptions.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>
          <p className="font-style-sample" style={{ fontFamily: selectedFontFamily.family }}>
            Live Event Title
          </p>
        </div>

        <label>
          Thumbnail
          <input type="file" accept="image/*" onChange={(event) => onThumbnailChange(event.target.files?.[0] ?? null)} />
        </label>
        {formState.thumbnailFile ? <p className="form-note">Selected file: {formState.thumbnailFile.name}</p> : null}
        {!formState.thumbnailFile && formState.thumbnailUrl ? <p className="form-note">Current thumbnail already uploaded.</p> : null}

        <h3>Client Information</h3>
        <label>Client Name *<input value={formState.clientName} onChange={(event) => onFieldChange("clientName", event.target.value)} required /></label>

        {submitError ? <p className="status-message error">{submitError}</p> : null}
        {submitSuccess ? <p className="status-message success">{submitSuccess}</p> : null}

        <div className="form-actions">
          {editingEventId ? <button type="button" className="secondary-btn" onClick={onCancelEdit}>Cancel</button> : null}
          <button type="submit" className="create-btn" disabled={isSubmitting}>{isSubmitting ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}</button>
        </div>
      </form>
    </section>
  );
}

function LoginScreen({ onLogin, errorMessage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    onLogin(username, password);
  };

  return (
    <main className="login-screen">
      <div className="bg-overlay" />
      <div className="login-box">
        <input
          placeholder="Username or Email"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSubmit();
            }
          }}
        />
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        <button type="button" className="login-btn" onClick={handleSubmit}>Login</button>
      </div>
    </main>
  );
}

function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [loginError, setLoginError] = useState("");
  const [active, setActive] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventFilters, setEventFilters] = useState(initialEventFilters);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [formState, setFormState] = useState(initialFormState);
  const [editingEventId, setEditingEventId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setEventsError("");

    try {
      const data = await requestApi("getLiveEvents.php");
      const nextEvents = (data.data || []).map((event) => normalizeEvent(event, currentUser));
      setEvents(nextEvents);
    } catch (error) {
      setEventsError(error instanceof Error ? error.message : "Failed to load live events.");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isLoggedIn) {
      loadEvents();
    }
  }, [isLoggedIn, loadEvents]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const routeEventId = getRouteEventId(currentPath);

  const filteredEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);
    const searchTerm = eventFilters.search.trim().toLowerCase();

    return events.filter((event) => {
      if (eventFilters.dateFrom && event.eventDate < eventFilters.dateFrom) {
        return false;
      }

      if (eventFilters.dateTo && event.eventDate > eventFilters.dateTo) {
        return false;
      }

      if (eventFilters.quickFilter === "today" && event.eventDate !== today) {
        return false;
      }

      if (eventFilters.quickFilter === "tomorrow" && event.eventDate !== tomorrow) {
        return false;
      }

      if (eventFilters.quickFilter === "upcoming" && event.eventDate <= tomorrow) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const searchableValue = [
        event.id,
        event.title,
        event.subtitle,
        event.eventUrl,
        event.clientName,
        event.name
      ]
        .join(" ")
        .toLowerCase();

      return searchableValue.includes(searchTerm);
    });
  }, [eventFilters, events]);

  const hasActiveFilters = Boolean(
    eventFilters.dateFrom || eventFilters.dateTo || eventFilters.search.trim() || eventFilters.quickFilter
  );

  const handleSectionSelect = (section) => {
    setActive(section);
    setMobileNavOpen(false);
  };

  const handleFormFieldChange = (field, value) => {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleFilterChange = (field, value) => {
    setEventFilters((current) => {
      const nextFilters = {
        ...current,
        [field]: value
      };

      if (field === "dateFrom" || field === "dateTo") {
        nextFilters.quickFilter = "";
      }

      return nextFilters;
    });
  };

  const handleQuickFilterChange = (quickFilter) => {
    setEventFilters((current) => ({
      ...current,
      quickFilter: current.quickFilter === quickFilter ? "" : quickFilter,
      dateFrom: "",
      dateTo: ""
    }));
  };

  const handleResetFilters = () => {
    setEventFilters(initialEventFilters);
  };

  const resetForm = () => {
    setFormState(initialFormState);
    setEditingEventId(null);
    setSubmitError("");
    setSubmitSuccess("");
  };

  const handleCreateClick = () => {
    resetForm();
    handleSectionSelect("create");
  };

  const handleEditClick = (row) => {
    setFormState({
      title: row.title,
      subtitle: row.subtitle,
      eventUrl: row.eventUrl,
      selectedTemplate: row.selectedTemplate,
      eventDate: row.eventDate,
      eventHour: row.eventHour,
      eventMinute: row.eventMinute,
      meridiem: row.meridiem,
      selectedFontFamily: row.selectedFontFamily,
      thumbnailFile: null,
      thumbnailUrl: row.thumbnailUrl,
      clientName: row.clientName
    });
    setEditingEventId(row.apiId);
    setSubmitError("");
    setSubmitSuccess("");
    handleSectionSelect("create");
  };

  const handlePreviewClick = (row) => {
    const nextPath = getEventRoute(row.apiId, row.name || row.title);
    window.history.pushState({}, "", nextPath);
    setCurrentPath(nextPath);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const endpoint = editingEventId ? "updateLiveEvent.php" : "createLiveEvent.php";
      const body = buildEventFormData(formState, editingEventId);
      const data = await requestApi(endpoint, {
        method: "POST",
        body
      });

      setSubmitSuccess(data.message || (editingEventId ? "Live event updated successfully." : "Live event created successfully."));
      await loadEvents();
      resetForm();
      handleSectionSelect("events");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save the live event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = (username, password) => {
    const normalizedUser = username.trim();

    if ((normalizedUser === "HDlive" || normalizedUser === "Live Streaming") && password === "12345") {
      setCurrentUser("Live Streaming");
      setLoginError("");
      setIsLoggedIn(true);
      return;
    }

    setLoginError("Invalid username or password");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser("");
    setLoginError("");
    setMobileNavOpen(false);
    setEvents([]);
    setEventFilters(initialEventFilters);
    resetForm();
  };

  const handleBackToApp = () => {
    window.history.pushState({}, "", "/");
    setCurrentPath("/");
  };

  if (routeEventId) {
    return <LiveEventPage eventId={routeEventId} onBackToApp={handleBackToApp} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} errorMessage={loginError} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        onSelect={handleSectionSelect}
        username={currentUser}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((current) => !current)}
      />
      <div className="content-area">
        <div className="topbar"><button type="button" className="logout" onClick={handleLogout}>Logout</button></div>
        {active === "dashboard" ? (
          <DashboardSection
            rows={events}
            isLoading={isLoadingEvents}
            errorMessage={eventsError}
            onEditClick={handleEditClick}
            onPreviewClick={handlePreviewClick}
          />
        ) : null}
        {active === "events" ? (
          <EventsSection
            rows={filteredEvents}
            isLoading={isLoadingEvents}
            errorMessage={eventsError}
            filters={eventFilters}
            hasActiveFilters={hasActiveFilters}
            onFilterChange={handleFilterChange}
            onQuickFilterChange={handleQuickFilterChange}
            onResetFilters={handleResetFilters}
            onCreateClick={handleCreateClick}
            onEditClick={handleEditClick}
            onPreviewClick={handlePreviewClick}
          />
        ) : null}
        {active === "create" ? (
          <CreateSection
            formState={formState}
            editingEventId={editingEventId}
            isSubmitting={isSubmitting}
            submitError={submitError}
            submitSuccess={submitSuccess}
            onFieldChange={handleFormFieldChange}
            onThumbnailChange={(file) => handleFormFieldChange("thumbnailFile", file)}
            onSubmit={handleFormSubmit}
            onCancelEdit={resetForm}
          />
        ) : null}
      </div>
    </div>
  );
}

export default App;
