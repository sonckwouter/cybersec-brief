/**
 * CyberSec Brief PWA Controller
 */

// State
let allArticles = [];
let dailyTheme = "";
let currentCategory = "ALL";
let currentTab = "feed"; // "feed" | "bookmarks"
let savedBookmarks = JSON.parse(localStorage.getItem("cybersec_bookmarks") || "[]");

// DOM Elements
const dateLabel = document.getElementById("dateLabel");
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

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("Service Worker registered successfully.", reg.scope))
      .catch((err) => console.warn("Service Worker registration failed:", err));
  });
}

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

// Load News Data
async function loadData() {
  try {
    pullStatus.textContent = "Updating news feed...";
    pullStatus.classList.add("show");

    // Cache buster for manual refresh
    const res = await fetch(`./data/latest.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    allArticles = data.items || [];
    dailyTheme = data.daily_theme || "Today's top cyber security updates.";

    // Update Date
    if (data.generated_date) {
      dateLabel.textContent = `${data.generated_date} • ${allArticles.length} stories`;
    } else {
      dateLabel.textContent = `Today • ${allArticles.length} stories`;
    }

    // Update Focus Banner
    focusText.textContent = dailyTheme;
    focusBanner.style.display = "block";

    // Setup Category Filter Chips
    setupCategories();

    // Render feed
    renderArticles();

    setTimeout(() => {
      pullStatus.classList.remove("show");
    }, 600);
  } catch (err) {
    console.error("Failed to load news data:", err);
    pullStatus.textContent = "Offline - Showing cached edition";
    setTimeout(() => {
      pullStatus.classList.remove("show");
    }, 2500);

    // Fallback if data/latest.json couldn't be loaded
    if (allArticles.length === 0) {
      emptyState.style.display = "block";
      emptyState.querySelector("p").textContent = "Unable to load intelligence feed. Check internet connection.";
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
      emptyState.querySelector("p").textContent = "You have no saved articles yet. Tap the bookmark icon on any article to save it.";
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
  loadData();
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

// Start
initTheme();
loadData();
