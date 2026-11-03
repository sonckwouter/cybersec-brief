import pytest
from src.config import load_config
from src.fetcher import clean_html, RawArticle
from src.summarizer import fallback_curation, CuratedArticle, CuratedDigest
from main import render_templates


def test_load_config():
    config = load_config()
    assert "cyber_security" in config.topics
    cs_topic = config.topics["cyber_security"]
    assert cs_topic.name == "Cyber Security"
    assert len(cs_topic.feeds) >= 3
    assert cs_topic.max_items == 10


def test_clean_html():
    raw = "<p>Hello <b>World</b>! <script>alert(1);</script> Visit <a href='https://example.com'>here</a>.</p>"
    cleaned = clean_html(raw)
    assert cleaned == "Hello World! Visit here."
    assert "script" not in cleaned
    assert "<p>" not in cleaned


def test_fallback_curation():
    raw_articles = [
        RawArticle(
            title=f"Security Incident {i}",
            link=f"https://example.com/{i}",
            summary=f"Incident summary {i}",
            source_name="BleepingComputer",
        )
        for i in range(15)
    ]

    digest = fallback_curation(raw_articles, max_items=10)
    assert isinstance(digest, CuratedDigest)
    assert len(digest.items) == 10
    assert digest.items[0].title == "Security Incident 0"
    assert digest.items[0].source_name == "BleepingComputer"


def test_render_templates():
    digest = CuratedDigest(
        daily_theme="High alert on critical zero-days.",
        items=[
            CuratedArticle(
                title="Critical Kernel Vulnerability Discovered",
                source_name="The Hacker News",
                link="https://thehackernews.com/test",
                category="Zero-Day",
                summary="A critical vulnerability was found in the Linux kernel.",
                key_points=["Affects v5.15+", "Patch immediately available"],
            )
        ],
    )

    html, text = render_templates("Cyber Security", digest)

    # HTML assertions
    assert "<!DOCTYPE html>" in html
    assert "Cyber Security" in html
    assert "Critical Kernel Vulnerability Discovered" in html
    assert "https://thehackernews.com/test" in html
    assert "The Hacker News" in html
    assert "Affects v5.15+" in html

    # Plain text assertions
    assert "CYBER SECURITY" in text
    assert "Critical Kernel Vulnerability Discovered" in text
    assert "Patch immediately available" in text
