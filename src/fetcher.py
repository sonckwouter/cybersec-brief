"""RSS Feed fetcher and article normalizer."""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
import time
import re
import feedparser
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel
from src.config import TopicConfig

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36 MorningNewsBot/1.0"
)


class RawArticle(BaseModel):
    title: str
    link: str
    summary: str
    source_name: str
    published_at: Optional[datetime] = None


def clean_html(raw_html: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    # Remove script and style elements
    for s in soup(["script", "style", "figure", "img"]):
        s.decompose()
    text = soup.get_text(separator=" ")
    # Fix spacing before punctuation caused by separator
    text = re.sub(r"\s+([.,!?;:])", r"\1", text)
    # Collapse consecutive whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_date(entry) -> Optional[datetime]:
    """Extract and convert publication date to UTC datetime."""
    parsed_time = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed_time:
        try:
            return datetime.fromtimestamp(time.mktime(parsed_time), tz=timezone.utc)
        except Exception:
            pass
    return None


def fetch_feed_articles(source_name: str, feed_url: str, lookback_hours: int = 36) -> List[RawArticle]:
    """Fetch and parse a single RSS/Atom feed."""
    articles: List[RawArticle] = []
    headers = {"User-Agent": DEFAULT_USER_AGENT}
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    try:
        response = requests.get(feed_url, headers=headers, timeout=15)
        response.raise_for_status()
        parsed = feedparser.parse(response.content)
    except Exception as e:
        print(f"⚠️ Error fetching feed '{source_name}' ({feed_url}): {e}")
        return articles

    for entry in parsed.entries:
        title = entry.get("title", "").strip()
        link = entry.get("link", "").strip()
        if not title or not link:
            continue

        raw_summary = entry.get("summary") or entry.get("description") or ""
        clean_sum = clean_html(raw_summary)

        pub_date = parse_date(entry)

        # Filter out articles older than lookback_hours (if date is available)
        if pub_date and pub_date < cutoff_time:
            continue

        articles.append(
            RawArticle(
                title=title,
                link=link,
                summary=clean_sum[:1000],  # keep concise summary snippet
                source_name=source_name,
                published_at=pub_date,
            )
        )

    return articles


def fetch_all_topic_articles(topic: TopicConfig) -> List[RawArticle]:
    """Fetch articles from all feeds defined in the topic."""
    all_articles: List[RawArticle] = []
    seen_links = set()

    for feed in topic.feeds:
        print(f"📡 Fetching: {feed.name} ...")
        feed_articles = fetch_feed_articles(
            source_name=feed.name,
            feed_url=feed.url,
            lookback_hours=topic.lookback_hours,
        )
        for art in feed_articles:
            if art.link not in seen_links:
                seen_links.add(art.link)
                all_articles.append(art)

    print(f"✅ Total fetched recent articles across {len(topic.feeds)} feeds: {len(all_articles)}")
    return all_articles
