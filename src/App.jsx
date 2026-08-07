/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import LiveChat from "./components/LiveChat/LiveChat";

const API_BASE_URL = "https://api.rmtechsolution.com";
const THUMBNAIL_BASE_URL = `${API_BASE_URL}/uploads/thumbnails`;
const TEMPLATE_UPLOAD_BASE_URL = `${API_BASE_URL}/uploads/templates`;
const CMS_MERCHANT_ID = 2;

const videoAlignOptions = [
  { key: "left", label: "Left alignment" },
  { key: "center", label: "Center alignment" },
  { key: "right", label: "Right alignment" }
];

const DEFAULT_TEMPLATE_LABEL = "Template 1";

const fontFamilyOptions = [
  { key: "montserrat", label: "Montserrat", family: '"Montserrat", "Manrope", sans-serif' },
  { key: "manrope", label: "Manrope", family: '"Manrope", "Segoe UI", sans-serif' },
  { key: "syne", label: "Syne", family: '"Syne", "Manrope", sans-serif' },
  { key: "georgia", label: "Georgia", family: 'Georgia, "Times New Roman", serif' },
  { key: "trebuchet", label: "Trebuchet", family: '"Trebuchet MS", "Segoe UI", sans-serif' }
];

const initialFormState = {
  title: "",
  subtitle: "",
  eventUrl: "eventurlname2024",
  selectedVideoAlign: videoAlignOptions[1].key,
  eventDate: "",
  eventHour: "01",
  eventMinute: "00",
  meridiem: "AM",
  selectedFontFamily: fontFamilyOptions[0].key,
  thumbnailFile: null,
  thumbnailUrl: "",
  webTemplateFile: null,
  webTemplateUrl: "",
  mobileTemplateFile: null,
  mobileTemplateUrl: "",
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

function getRouteEventId(pathname, search) {
  const segmentMatch = pathname.match(/^\/(\d+)(?:\/[^/]+)?\/?$/);
  if (segmentMatch) return segmentMatch[1];
  const params = new URLSearchParams(search || "");
  const eid = params.get("eid") || params.get("eventId");
  if (eid && /^\d+$/.test(eid)) return eid;
  return null;
}

function resolveUploadUrl(assetPath, baseUrl) {
  if (!assetPath) {
    return "";
  }

  if (assetPath.startsWith("http")) {
    return assetPath;
  }

  if (assetPath.startsWith("/")) {
    return `${API_BASE_URL}${assetPath}`;
  }

  return `${baseUrl}/${String(assetPath).replace(/^\/+/, "")}`;
}

function getFirstPopulatedValue(values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function normalizeVideoAlignValue(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return "center";
  }

  if (normalized === "left" || normalized.includes("left")) {
    return "left";
  }

  if (normalized === "right" || normalized.includes("right")) {
    return "right";
  }

  if (normalized === "center" || normalized.includes("center") || normalized.includes("centre")) {
    return "center";
  }

  return "center";
}

function getEventTemplateUrls(event) {
  const webTemplate = getFirstPopulatedValue([
    event.web_template,
    event.web_view_template,
    event.template_web,
    event.webTemplate,
    event.webTemplateUrl
  ]);
  const mobileTemplate = getFirstPopulatedValue([
    event.mobile_template,
    event.mobile_view_template,
    event.template_mobile,
    event.mobileTemplate,
    event.mobileTemplateUrl
  ]);

  return {
    webTemplateUrl: resolveUploadUrl(webTemplate, TEMPLATE_UPLOAD_BASE_URL),
    mobileTemplateUrl: resolveUploadUrl(mobileTemplate, TEMPLATE_UPLOAD_BASE_URL)
  };
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

    return /^https?:/i.test(eventUrl) ? eventUrl : "";
  } catch {
    return "";
  }
}

function normalizeLiveEventDetails(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const id = event.id ?? event.apiId ?? "";

  return {
    id,
    apiId: id,
    title: event.title ?? "",
    subtitle: event.subtitle ?? "",
    event_url: event.event_url ?? event.eventUrl ?? "",
    event_date: event.event_date ?? event.eventDate ?? "",
    event_time: event.event_time ?? event.eventTime ?? "",
    font_family: event.font_family ?? event.fontFamily ?? "",
    template: event.template ?? DEFAULT_TEMPLATE_LABEL,
    thumbnail: event.thumbnail ?? event.thumbnailUrl ?? "",
    web_template: event.web_template ?? event.webTemplate ?? event.webTemplateUrl ?? "",
    mobile_template: event.mobile_template ?? event.mobileTemplate ?? event.mobileTemplateUrl ?? "",
    client_name: event.client_name ?? event.clientName ?? "",
    video_align: event.video_align ?? event.videoAlign ?? event.text_align ?? event.textAlign ?? "center",
    text_align: event.text_align ?? event.textAlign ?? event.video_align ?? event.videoAlign ?? "center",
    createdAt: event.createdAt ?? event.created_at ?? "",
    updatedAt: event.updatedAt ?? event.updated_at ?? ""
  };
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
  const fontKey = fontFamilyOptions.find((item) => item.label === event.font_family)?.key ?? fontFamilyOptions[1].key;
  const timeParts = parseTimeForForm(event.event_time);
  const thumbnailUrl = resolveUploadUrl(event.thumbnail, THUMBNAIL_BASE_URL);
  const { webTemplateUrl, mobileTemplateUrl } = getEventTemplateUrls(event);
  const selectedVideoAlign = normalizeVideoAlignValue(
    getFirstPopulatedValue([event.video_align, event.videoAlign, event.text_align, event.textAlign])
  );

  return {
    apiId: event.id,
    id: String(event.id),
    title: event.title ?? "",
    subtitle: event.subtitle ?? "",
    eventUrl: event.event_url ?? "",
    selectedVideoAlign,
    eventDate: event.event_date ?? "",
    eventHour: timeParts.eventHour,
    eventMinute: timeParts.eventMinute,
    meridiem: timeParts.meridiem,
    selectedFontFamily: fontKey,
    thumbnailUrl,
    webTemplateUrl,
    mobileTemplateUrl,
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
  const data = await requestApi(`fetchLiveEvent.php?id=${encodeURIComponent(eventId)}`);
  const payload = Array.isArray(data.data) ? data.data[0] : data.data || data.event || data;
  return normalizeLiveEventDetails(payload);
}

function getBootstrappedEvent(eventId) {
  const event = window.EVENT;
  if (!event || typeof event !== "object") return null;
  const bootstrappedId = String(event.id ?? event.apiId ?? eventId);
  return bootstrappedId === String(eventId) ? normalizeLiveEventDetails(event) : null;
}

function extractUploadedImageUrl(payload) {
  const possibleValues = [
    payload?.imageUrl,
    payload?.image_url,
    payload?.url,
    payload?.fileUrl,
    payload?.file_url,
    payload?.path,
    payload?.filePath,
    payload?.oldImageUrl,
    payload?.old_image_url,
    payload?.data?.imageUrl,
    payload?.data?.image_url,
    payload?.data?.url,
    payload?.data?.fileUrl,
    payload?.data?.file_url,
    payload?.data?.path,
    payload?.data?.filePath,
    payload?.data?.oldImageUrl,
    payload?.data?.old_image_url
  ];

  return getFirstPopulatedValue(possibleValues);
}

async function uploadCmsImage(file, oldImageUrl = "") {
  if (!file) {
    return "";
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("merchantId", String(CMS_MERCHANT_ID));

  if (oldImageUrl) {
    formData.append("oldImageUrl", oldImageUrl);
  }

  const data = await requestApi("uploadCmsImage", {
    method: "POST",
    body: formData
  });

  const uploadedUrl = extractUploadedImageUrl(data);

  if (!uploadedUrl) {
    throw new Error("Image upload completed but no image URL was returned.");
  }

  return uploadedUrl;
}

function buildEventFormData(formState, editingEventId, assetUrls = {}) {
  const formData = new FormData();
  const selectedFontFamily = fontFamilyOptions.find((item) => item.key === formState.selectedFontFamily) ?? fontFamilyOptions[0];
  const selectedVideoAlign = normalizeVideoAlignValue(formState.selectedVideoAlign || videoAlignOptions[1].key);

  formData.append("title", formState.title.trim());
  formData.append("subtitle", formState.subtitle.trim());
  formData.append("event_url", formState.eventUrl.trim());
  formData.append("template", DEFAULT_TEMPLATE_LABEL);
  formData.append("video_align", selectedVideoAlign);
  formData.append("text_align", selectedVideoAlign);
  formData.append("event_date", formState.eventDate);
  formData.append("event_time", to24HourTime(formState.eventHour, formState.eventMinute, formState.meridiem));
  formData.append("font_family", selectedFontFamily.label);
  formData.append("client_name", formState.clientName.trim());

  if (editingEventId != null) {
    formData.append("id", String(editingEventId));
  }

  if (assetUrls.thumbnailUrl) {
    formData.append("thumbnail", assetUrls.thumbnailUrl);
  } else if (formState.thumbnailUrl) {
    formData.append("thumbnail", formState.thumbnailUrl);
  }

  if (assetUrls.webTemplateUrl) {
    formData.append("web_template", assetUrls.webTemplateUrl);
  } else if (formState.webTemplateUrl) {
    formData.append("web_template", formState.webTemplateUrl);
  }

  if (assetUrls.mobileTemplateUrl) {
    formData.append("mobile_template", assetUrls.mobileTemplateUrl);
  } else if (formState.mobileTemplateUrl) {
    formData.append("mobile_template", formState.mobileTemplateUrl);
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

  const effectiveEventId = useMemo(() => {
    if (eventId) return String(eventId);
    const match = window.location.pathname.match(/^\/(\d+)(?:\/[^/]+)?\/?$/);
    return match ? match[1] : null;
  }, [eventId]);

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
        const data = getBootstrappedEvent(effectiveEventId) || await fetchLiveEventById(effectiveEventId);

        if (!data) {
          throw new Error("Live event not found.");
        }

        if (isMounted) {
          setEventDetails(data);
          console.log("Loaded event details:", data.thumbnail);
          // Update meta tags dynamically
          const thumbnailUrl = resolveUploadUrl(data.thumbnail, THUMBNAIL_BASE_URL);
          const ogImageMeta = document.querySelector('#meta-og-image') || document.querySelector('meta[property="og:image"]');
          const twitterImageMeta = document.querySelector('#meta-twitter-image') || document.querySelector('meta[name="twitter:image"]');
          const pageTitle = document.querySelector('title');
          const ogTitleMeta = document.querySelector('#meta-og-title') || document.querySelector('meta[property="og:title"]');
          const twitterTitleMeta = document.querySelector('#meta-twitter-title') || document.querySelector('meta[name="twitter:title"]');

          if (ogImageMeta && thumbnailUrl) {
            ogImageMeta.setAttribute("content", thumbnailUrl);
          }
          if (twitterImageMeta && thumbnailUrl) {
            twitterImageMeta.setAttribute("content", thumbnailUrl);
          }
          if (pageTitle) {
            pageTitle.textContent = data.title || "Livestream";
          }
          if (ogTitleMeta) {
            ogTitleMeta.setAttribute("content", data.title || "Livestream Event");
          }
          if (twitterTitleMeta) {
            twitterTitleMeta.setAttribute("content", data.title || "Livestream Event");
          }
          const id = data.id || data.apiId || effectiveEventId;
          const slug = slugify(data.client_name || data.title || "event");
          const canonical = `/${id}/${slug}`;
          if (window.location.pathname !== canonical) {
            window.history.replaceState({}, "", canonical);
          }
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
 }, [effectiveEventId]);

  const customTemplateUrls = getEventTemplateUrls(eventDetails || {});
  const eventThumbnailUrl = resolveUploadUrl(eventDetails?.thumbnail, THUMBNAIL_BASE_URL);
  const eventEmbedUrl = getEmbedUrl(eventDetails?.event_url);
  const eventVideoAlign = normalizeVideoAlignValue(
    getFirstPopulatedValue([eventDetails?.video_align, eventDetails?.videoAlign, eventDetails?.text_align, eventDetails?.textAlign])
  );
  const videoRowJustifyContent = eventVideoAlign === "left"
    ? "flex-start"
    : eventVideoAlign === "right"
      ? "flex-end"
      : "center";
  const backgroundHero = isMobileViewport
    ? customTemplateUrls.mobileTemplateUrl || customTemplateUrls.webTemplateUrl || eventThumbnailUrl
    : customTemplateUrls.webTemplateUrl || customTemplateUrls.mobileTemplateUrl || eventThumbnailUrl;
  const chatStreamId = String(eventDetails?.id ?? eventDetails?.apiId ?? effectiveEventId);


  const handleWhatsAppShare = useCallback(() => {
    if (!eventDetails) return;

    const title = eventDetails.title || "Live Event";
    const date = formatEventDate(eventDetails.event_date);
    const time = formatEventTime(eventDetails.event_time);
    const sharePageUrl = window.location.href;

    

    // Construct the share message (title, date/time and URL)
    const message = `${title}\n${date} ${time}\n${sharePageUrl}`;
    const encoded = encodeURIComponent(message);
    const shareUrl = `https://wa.me/?text=${encoded}`;

    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, [eventDetails]);

  const formattedUpdatedAt = useMemo(() => {
    if (!eventDetails?.updatedAt) {
      return "";
    }

    const parsed = new Date(String(eventDetails.updatedAt).replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? eventDetails.updatedAt : parsed.toLocaleString();
  }, [eventDetails]);

  return (
    <main
      className="event-page"
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
            {/* <div className="event-meta-row">
              {eventDetails.client_name ? <span className="event-meta-pill">Client: {eventDetails.client_name}</span> : null}
              {formattedUpdatedAt ? <span className="event-meta-pill">Updated: {formattedUpdatedAt}</span> : null}
            </div> */}
          </div>

          <div className="event-page-layout">
            <div className="event-page-copy" style={{width:"100%"}}>
              {eventEmbedUrl ? (
                <div className="event-video-row" style={{ justifyContent: videoRowJustifyContent }}>
                  <div className="event-video-frame">
                    <iframe
                      src={eventEmbedUrl}
                      title={eventDetails.title || "Live Event"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : null}

              <LiveChat streamId={chatStreamId} />
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
  onWebTemplateChange,
  onMobileTemplateChange,
  onSubmit,
  onCancelEdit
}) {
  const webTemplateInputRef = useRef(null);
  const mobileTemplateInputRef = useRef(null);
  const selectedFontFamily = fontFamilyOptions.find((item) => item.key === formState.selectedFontFamily) ?? fontFamilyOptions[0];
  const [webTemplatePreviewUrl, setWebTemplatePreviewUrl] = useState(formState.webTemplateUrl || "");
  const [mobileTemplatePreviewUrl, setMobileTemplatePreviewUrl] = useState(formState.mobileTemplateUrl || "");
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(formState.thumbnailUrl || "");

  useEffect(() => {
    let nextWebTemplatePreviewUrl = formState.webTemplateUrl || "";
    let nextMobileTemplatePreviewUrl = formState.mobileTemplateUrl || "";
    let nextThumbnailPreviewUrl = formState.thumbnailUrl || "";
    let objectUrls = [];

    if (formState.webTemplateFile) {
      nextWebTemplatePreviewUrl = URL.createObjectURL(formState.webTemplateFile);
      objectUrls.push(nextWebTemplatePreviewUrl);
    }

    if (formState.mobileTemplateFile) {
      nextMobileTemplatePreviewUrl = URL.createObjectURL(formState.mobileTemplateFile);
      objectUrls.push(nextMobileTemplatePreviewUrl);
    }

    if (formState.thumbnailFile) {
      nextThumbnailPreviewUrl = URL.createObjectURL(formState.thumbnailFile);
      objectUrls.push(nextThumbnailPreviewUrl);
    }

    setWebTemplatePreviewUrl(nextWebTemplatePreviewUrl);
    setMobileTemplatePreviewUrl(nextMobileTemplatePreviewUrl);
    setThumbnailPreviewUrl(nextThumbnailPreviewUrl);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [formState.mobileTemplateFile, formState.mobileTemplateUrl, formState.thumbnailFile, formState.thumbnailUrl, formState.webTemplateFile, formState.webTemplateUrl]);

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
            Video Alignment
            <select value={formState.selectedVideoAlign} onChange={(event) => onFieldChange("selectedVideoAlign", event.target.value)}>
              {videoAlignOptions.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="template-upload-grid" aria-label="Selected template previews">
          <div className="template-thumb">
            <p className="template-thumb-label">Web View</p>
            {webTemplatePreviewUrl ? <img src={webTemplatePreviewUrl} alt="Web view thumbnail" className="template-thumb-image" /> : <div className="template-thumb-empty" aria-hidden="true" />}
            <label className="template-thumb-control">
              Or Upload Web View Template
              <button
                type="button"
                className="choose-template-btn"
                onClick={() => webTemplateInputRef.current?.click()}
              >
                Choose
              </button>
              <input
                ref={webTemplateInputRef}
                className="hidden-template-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  onWebTemplateChange(event.target.files?.[0] ?? null);
                  onFieldChange("webTemplateUrl", "");
                }}
              />
            </label>
          </div>
          <div className="template-thumb">
            <p className="template-thumb-label">Mobile View</p>
            {mobileTemplatePreviewUrl ? <img src={mobileTemplatePreviewUrl} alt="Mobile view thumbnail" className="template-thumb-image" /> : <div className="template-thumb-empty" aria-hidden="true" />}
            <label className="template-thumb-control">
              Or Upload Mobile View Template
              <button
                type="button"
                className="choose-template-btn"
                onClick={() => mobileTemplateInputRef.current?.click()}
              >
                Choose
              </button>
              <input
                ref={mobileTemplateInputRef}
                className="hidden-template-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  onMobileTemplateChange(event.target.files?.[0] ?? null);
                  onFieldChange("mobileTemplateUrl", "");
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid two">
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

        <div className="template-upload-grid" aria-label="Thumbnail preview">
          <div className="template-thumb">
            <p className="template-thumb-label">Thumbnail Preview</p>
            {thumbnailPreviewUrl ? <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="template-thumb-image" /> : <div className="template-thumb-empty" aria-hidden="true" />}
          </div>
        </div>

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

  const routeEventId = getRouteEventId(currentPath, window.location.search);

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
      selectedVideoAlign: row.selectedVideoAlign || videoAlignOptions[1].key,
      eventDate: row.eventDate,
      eventHour: row.eventHour,
      eventMinute: row.eventMinute,
      meridiem: row.meridiem,
      selectedFontFamily: row.selectedFontFamily,
      thumbnailFile: null,
      thumbnailUrl: row.thumbnailUrl,
      webTemplateFile: null,
      webTemplateUrl: row.webTemplateUrl,
      mobileTemplateFile: null,
      mobileTemplateUrl: row.mobileTemplateUrl,
      clientName: row.clientName
    });
    setEditingEventId(row.apiId);
    setSubmitError("");
    setSubmitSuccess("");
    handleSectionSelect("create");
  };

 const handlePreviewClick = (row) => {
    const nextPath = getEventRoute(row.apiId, row.clientName || row.title);
    window.open(nextPath, "_blank", "noopener,noreferrer");
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      let nextThumbnailUrl = formState.thumbnailUrl;
      let nextWebTemplateUrl = formState.webTemplateUrl;
      let nextMobileTemplateUrl = formState.mobileTemplateUrl;

      if (formState.thumbnailFile) {
        nextThumbnailUrl = await uploadCmsImage(formState.thumbnailFile, formState.thumbnailUrl);
      }

      if (formState.webTemplateFile) {
        nextWebTemplateUrl = await uploadCmsImage(formState.webTemplateFile, formState.webTemplateUrl);
      }

      if (formState.mobileTemplateFile) {
        nextMobileTemplateUrl = await uploadCmsImage(formState.mobileTemplateFile, formState.mobileTemplateUrl);
      }

      const endpoint = editingEventId ? "updateLiveEvent.php" : "createLiveEvent.php";
      const body = buildEventFormData(formState, editingEventId, {
        thumbnailUrl: nextThumbnailUrl,
        webTemplateUrl: nextWebTemplateUrl,
        mobileTemplateUrl: nextMobileTemplateUrl
      });
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
            onWebTemplateChange={(file) => handleFormFieldChange("webTemplateFile", file)}
            onMobileTemplateChange={(file) => handleFormFieldChange("mobileTemplateFile", file)}
            onSubmit={handleFormSubmit}
            onCancelEdit={resetForm}
          />
        ) : null}
      </div>
    </div>
  );
}

export default App;
