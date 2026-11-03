"""Main entry point for Morning News Newsletter Generator."""

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

# Ensure UTF-8 output handling on Windows consoles
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from src.config import load_config
from src.fetcher import fetch_all_topic_articles
from src.summarizer import curate_and_summarize
from src.mailer import send_email

BASE_DIR = Path(__file__).resolve().parent


def render_templates(topic_name: str, digest) -> tuple[str, str]:
    """Render HTML and plain-text newsletter templates using Jinja2."""
    env = Environment(
        loader=FileSystemLoader(BASE_DIR / "templates"),
        autoescape=True,
    )

    now_utc = datetime.now(timezone.utc)
    current_date = now_utc.strftime("%A, %B %d, %Y")
    current_time = now_utc.strftime("%H:%M")

    template_vars = {
        "topic_name": topic_name,
        "digest": digest,
        "current_date": current_date,
        "current_time": current_time,
    }

    html_template = env.get_template("newsletter.html")
    html_content = html_template.render(**template_vars)

    # Plain text template does not need HTML autoescaping
    text_env = Environment(
        loader=FileSystemLoader(BASE_DIR / "templates"),
        autoescape=False,
    )
    text_template = text_env.get_template("newsletter.txt")
    text_content = text_template.render(**template_vars)

    return html_content, text_content


def main():
    parser = argparse.ArgumentParser(description="Morning News Automated Newsletter Generator")
    parser.add_argument(
        "--topic",
        type=str,
        default=None,
        help="Topic identifier matching an entry in config/feeds.yaml (default: cyber_security)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run feed fetching and curation without sending an email (always creates preview.html)",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Generate preview.html locally for visual review",
    )
    parser.add_argument(
        "--to",
        type=str,
        default=None,
        help="Override recipient email address for testing",
    )
    parser.add_argument(
        "--no-ai",
        action="store_true",
        help="Disable Gemini AI and use simple heuristic curation",
    )

    args = parser.parse_args()

    config = load_config()
    topic_key = args.topic or config.default_topic

    if topic_key not in config.topics:
        available = ", ".join(config.topics.keys())
        print(f"❌ Error: Topic '{topic_key}' not found in config/feeds.yaml.")
        print(f"Available topics: {available}")
        sys.exit(1)

    topic = config.topics[topic_key]
    print("=" * 60)
    print(f"🌅 Morning News Brief: {topic.name}")
    print("=" * 60)

    # 1. Fetch articles from configured RSS feeds
    raw_articles = fetch_all_topic_articles(topic)
    if not raw_articles:
        print("⚠️ Warning: No articles were found in the specified lookback window.")

    # 2. Curate and summarize via Gemini AI
    api_key = None if args.no_ai else config.gemini_api_key
    digest = curate_and_summarize(
        articles=raw_articles,
        api_key=api_key,
        topic_name=topic.name,
        max_items=topic.max_items,
    )

    print(f"\n📰 Digest Focus: {digest.daily_theme}")
    print(f"📊 Curated stories: {len(digest.items)}")
    for i, it in enumerate(digest.items, 1):
        print(f"  [{i}] ({it.category}) {it.title} - {it.source_name}")

    # 3. Render Templates
    html_content, text_content = render_templates(topic.name, digest)

    # Always generate preview.html for dry-run or preview flags
    if args.dry_run or args.preview:
        preview_file = BASE_DIR / "preview.html"
        preview_file.write_text(html_content, encoding="utf-8")
        print(f"\n💾 Preview HTML written to: {preview_file.resolve()}")

    if args.dry_run:
        print("\n🏁 Dry run complete! No email sent.")
        return

    # 4. Email Dispatch
    now_utc = datetime.now(timezone.utc)
    date_str = now_utc.strftime("%b %d")
    top_story = digest.items[0].title if digest.items else topic.name
    subject = f"🛡️ [{topic.name} Brief] {top_story} ({date_str})"

    recipient = args.to or config.email_to
    if not recipient:
        print("⚠️ No recipient configured (EMAIL_TO is empty). Skipping email dispatch.")
        print("Use --dry-run or set EMAIL_TO in your .env / GitHub Secrets.")
        return

    send_email(
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        config=config,
        to_email=recipient,
    )


if __name__ == "__main__":
    main()
