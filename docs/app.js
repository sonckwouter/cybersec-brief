/**
 * CyberSec Brief PWA Controller
 * With Stale-While-Revalidate and Background Sync for 100% Offline Reading
 */

// State
let allArticles = [];
let dailyTheme = "";
let currentCategory = "ALL";
let currentTab = "feed"; // "feed" | "bookmarks"
let savedBookmarks = JSON.parse(localStorage.getItem("cybersec_bookmarks") || "[]");

// DOM Elements
const dateLabel = document.getElementById("dateLabel");
const offlineStatus = document.getElementById("offlineStatus");
const focusBanner = document.getElementById("focusBanner");
const focusText = document.getElementById("focusText");
const filterBar = document.getElementById("filterBar");
const feedList = document.getElementById("feedList");
const emptyState = document.getElementById("emptyState");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const refreshBtn = document.getElementById("refreshBtn");
const navFeed = document.getElementById("navFeed");
const navBookmarks = document.getElementById("navBookmarks");
const pullStatus = document.getElementById("pullStatus");

// Register Service Worker & Periodic Background Sync
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      console.log("[PWA] Service Worker registered:", reg.scope);

      // Attempt to register Periodic Background Sync for morning updates (if supported by browser/Android)
      if ("periodicSync" in reg) {
        try {
          const status = await navigator.permissions.query({ name: "periodic-background-sync" });
          if (status.state === "granted" || status.state === "prompt") {
            await reg.periodicSync.register("update-daily-news", {
              minInterval: 12 * 60 * 60 * 1000 // every 12 hours
            });
            console.log("[PWA] Periodic Background Sync registered successfully.");
          }
        } catch (e) {
          console.log("[PWA] Periodic sync permission note:", e.message);
        }
      }
    } catch (err) {
      console.warn("[PWA] Service Worker registration failed:", err);
    }
  });
}

// Update Connectivity UI
function updateNetworkStatus() {
  if (!offlineStatus) return;
  if (navigator.onLine) {
    offlineStatus.className = "offline-pill online";
    offlineStatus.textContent = "📥 Offline Ready";
    offlineStatus.title = "Today's edition is downloaded and saved on your device for offline reading.";
  } else {
    offlineStatus.className = "offline-pill offline";
    offlineStatus.textContent = "📡 Offline Mode";
    offlineStatus.title = "You are currently offline. Viewing cached morning edition.";
  }
}

window.addEventListener("online", () => {
  updateNetworkStatus();
  loadData(false); // Silently check for updates when re-connected
});

window.addEventListener("offline", () => {
  updateNetworkStatus();
  pullStatus.textContent = "Offline mode active - All articles available locally";
  pullStatus.classList.add("show");
  setTimeout(() => pullStatus.classList.remove("show"), 2500);
});

// Initialize Theme
function initTheme() {
  const savedTheme = localStorage.getItem("cybersec_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("cybersec_theme", next);
  updateThemeIcon(next);
});

// Populate UI from Data Object
function applyNewsData(data, isFromCache = false) {
  if (!data || !data.items || data.items.length === 0) return false;

  allArticles = data.items || [];
  dailyTheme = data.daily_theme || "Today's top cyber security updates.";

  // Update Date
  const dateStr = data.generated_date || "Today";
  const offlineTag = isFromCache && !navigator.onLine ? " (Offline)" : "";
  dateLabel.textContent = `${dateStr} • ${allArticles.length} stories${offlineTag}`;

  // Update Focus Banner
  focusText.textContent = dailyTheme;
  focusBanner.style.display = "block";

  // Setup Category Filter Chips
  setupCategories();

  // Render feed
  renderArticles();
  return true;
}

// Immediate Local Hydration (0ms offline startup)
function hydrateFromLocalStorage() {
  try {
    const rawLocal = localStorage.getItem("cybersec_latest_edition");
    if (rawLocal) {
      const cached = JSON.parse(rawLocal);
      applyNewsData(cached, true);
    }
  } catch (e) {
    console.warn("[PWA] Error reading local offline storage:", e);
  }
}

// Load News Data (Stale-While-Revalidate)
async function loadData(showFeedback = true) {
  if (showFeedback) {
    pullStatus.textContent = "Checking for latest morning edition...";
    pullStatus.classList.add("show");
  }

  // 1. If we don't have articles rendered yet, hydrate immediately from localStorage
  if (allArticles.length === 0) {
    hydrateFromLocalStorage();
  }

  // 2. Fetch fresh edition from network
  try {
    const res = await fetch(`./data/latest.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    // Persist full edition in LocalStorage for instant offline availability
    localStorage.setItem("cybersec_latest_edition", JSON.stringify(data));

    applyNewsData(data, false);
    updateNetworkStatus();

    if (showFeedback) {
      pullStatus.textContent = "Updated & Downloaded for offline reading!";
      setTimeout(() => pullStatus.classList.remove("show"), 1000);
    }
  } catch (err) {
    console.log("[PWA] Network fetch note (using cached edition):", err.message);
    updateNetworkStatus();

    // If still no articles rendered, try local cache again
    if (allArticles.length === 0) {
      hydrateFromLocalStorage();
    }

    if (allArticles.length > 0) {
      if (showFeedback) {
        pullStatus.textContent = "Viewing downloaded morning edition (offline)";
        setTimeout(() => pullStatus.classList.remove("show"), 2000);
      }
    } else {
      emptyState.style.display = "block";
      emptyState.querySelector("p").textContent = "Unable to load intelligence brief. Please connect to the internet to download today's edition.";
      if (showFeedback) {
        pullStatus.classList.remove("show");
      }
    }
  }
}

// Setup Category Chips
function setupCategories() {
  filterBar.innerHTML = "";
  if (currentTab === "bookmarks") {
    filterBar.style.display = "none";
    return;
  }
  filterBar.style.display = "flex";

  const categories = ["ALL", ...new Set(allArticles.map((a) => a.category).filter(Boolean))];

  categories.forEach((cat) => {
    const chip = document.createElement("button");
    chip.className = `chip-btn ${cat === currentCategory ? "active" : ""}`;
    chip.textContent = cat;
    chip.addEventListener("click", () => {
      currentCategory = cat;
      document.querySelectorAll(".chip-btn").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderArticles();
    });
    filterBar.appendChild(chip);
  });
}

// Render Articles
function renderArticles() {
  feedList.innerHTML = "";
  emptyState.style.display = "none";

  let listToRender = [];

  if (currentTab === "feed") {
    listToRender = currentCategory === "ALL"
      ? allArticles
      : allArticles.filter((a) => a.category === currentCategory);
    focusBanner.style.display = "block";
  } else {
    // Bookmarks Tab
    listToRender = savedBookmarks;
    focusBanner.style.display = "none";
  }

  if (listToRender.length === 0) {
    emptyState.style.display = "block";
    if (currentTab === "bookmarks") {
      emptyState.querySelector("p").textContent = "You have no saved articles yet. Tap the star icon on any article to save it for later.";
    } else {
      emptyState.querySelector("p").textContent = "No articles found in this category.";
    }
    return;
  }

  listToRender.forEach((article, index) => {
    const isSaved = savedBookmarks.some((b) => b.link === article.link);

    const card = document.createElement("article");
    card.className = "news-card";

    // Key points HTML
    let keyPointsHtml = "";
    if (article.key_points && article.key_points.length > 0) {
      const itemsHtml = article.key_points.map((pt) => `<li>${escapeHtml(pt)}</li>`).join("");
      keyPointsHtml = `
        <div class="key-points-box">
          <ul>${itemsHtml}</ul>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-top">
        <div class="card-tags">
          <span class="rank-badge">${index + 1}</span>
          <span class="category-badge">${escapeHtml(article.category || "CyberSec")}</span>
          <span class="source-label">• ${escapeHtml(article.source_name)}</span>
        </div>
        <button class="bookmark-btn ${isSaved ? "saved" : ""}" title="Save article" data-link="${encodeURIComponent(article.link)}">
          ${isSaved ? "★" : "☆"}
        </button>
      </div>

      <h2 class="news-title">
        <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(article.title)}
        </a>
      </h2>

      <p class="news-summary">${escapeHtml(article.summary)}</p>

      ${keyPointsHtml}

      <div class="card-actions">
        <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer" class="read-btn">
          Read full article ↗
        </a>
      </div>
    `;

    // Bookmark Click Handler
    const bookmarkBtn = card.querySelector(".bookmark-btn");
    bookmarkBtn.addEventListener("click", () => {
      toggleBookmark(article);
    });

    feedList.appendChild(card);
  });
}

// Toggle Bookmark
function toggleBookmark(article) {
  const index = savedBookmarks.findIndex((b) => b.link === article.link);
  if (index > -1) {
    savedBookmarks.splice(index, 1);
  } else {
    savedBookmarks.unshift(article);
  }
  localStorage.setItem("cybersec_bookmarks", JSON.stringify(savedBookmarks));
  renderArticles();
}

// Bottom Navigation Switching
navFeed.addEventListener("click", () => {
  currentTab = "feed";
  navFeed.classList.add("active");
  navBookmarks.classList.remove("active");
  setupCategories();
  renderArticles();
});

navBookmarks.addEventListener("click", () => {
  currentTab = "bookmarks";
  navBookmarks.classList.add("active");
  navFeed.classList.remove("active");
  setupCategories();
  renderArticles();
});

// Refresh button
refreshBtn.addEventListener("click", () => {
  loadData(true);
});

// Helper for HTML escaping
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Startup
initTheme();
updateNetworkStatus();
loadData(false);
