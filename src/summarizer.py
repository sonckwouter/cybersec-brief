"""AI Summarizer and Curation engine using Google Gemini API."""

import json
from typing import List, Optional
from pydantic import BaseModel, Field
from src.fetcher import RawArticle


class CuratedArticle(BaseModel):
    title: str = Field(description="Clear, informative headline for the article.")
    source_name: str = Field(description="Name of the news source, e.g. The Hacker News.")
    link: str = Field(description="Original direct URL to the article.")
    category: str = Field(description="Short tag e.g. Vulnerability, Ransomware, Breach, Malware, Policy.")
    summary: str = Field(description="Concise 2-3 sentence explanation of what happened and why it matters.")
    key_points: List[str] = Field(description="2 to 3 bullet points with the most critical technical details or implications.")


class CuratedDigest(BaseModel):
    daily_theme: str = Field(description="A one-sentence summary capturing the overarching trend or biggest story of the day.")
    items: List[CuratedArticle] = Field(description="The top 10 curated articles, ranked from highest to lowest impact.")


def fallback_curation(articles: List[RawArticle], max_items: int = 10) -> CuratedDigest:
    """Fallback curation when AI is unavailable or disabled."""
    print("ℹ️ Using heuristic fallback curation (no Gemini API key or AI disabled).")
    selected = articles[:max_items]
    curated_items = []
    for art in selected:
        curated_items.append(
            CuratedArticle(
                title=art.title,
                source_name=art.source_name,
                link=art.link,
                category="Cyber Security",
                summary=art.summary[:250] + "..." if len(art.summary) > 250 else art.summary,
                key_points=[
                    f"Reported by {art.source_name}.",
                    "Click the link below to read the complete coverage.",
                ],
            )
        )
    return CuratedDigest(
        daily_theme="Today's top cyber security updates and incident reports.",
        items=curated_items,
    )


def curate_and_summarize(
    articles: List[RawArticle],
    api_key: Optional[str] = None,
    topic_name: str = "Cyber Security",
    max_items: int = 10,
) -> CuratedDigest:
    """Curate and summarize the top articles using Google Gemini API."""
    if not articles:
        return CuratedDigest(
            daily_theme="No new articles found in the screening window.",
            items=[],
        )

    if not api_key or api_key.strip() in ("", "your_gemini_api_key_here"):
        return fallback_curation(articles, max_items=max_items)

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("⚠️ google-genai library not installed. Falling back to heuristic curation.")
        return fallback_curation(articles, max_items=max_items)

    client = genai.Client(api_key=api_key)

    # Format incoming articles into a structured text context
    articles_payload = []
    for idx, art in enumerate(articles, 1):
        articles_payload.append(
            f"[{idx}] Source: {art.source_name}\n"
            f"Title: {art.title}\n"
            f"URL: {art.link}\n"
            f"Snippet: {art.summary}\n"
        )
    articles_text = "\n---\n".join(articles_payload)

    prompt = f"""You are an elite Senior Cyber Security Analyst and editor for an executive security intelligence brief.
Your goal is to screen today's incoming security news and curate the TOP {max_items} most impactful and relevant stories.

TOPIC: {topic_name}

INSTRUCTIONS:
1. DEDUPLICATION: If multiple outlets report on the exact same zero-day, breach, or event, DO NOT include duplicate items. Pick the single best, most detailed report.
2. RANKING & CURATION: Select up to {max_items} stories based on impact, novelty, severity (e.g. actively exploited vulnerabilities, major infrastructure breaches, critical threat actor campaigns).
3. SUMMARIES:
   - Write clear, executive-level English summaries (2 to 3 sentences) focusing on: what occurred, who is affected, and why it is significant.
   - Provide 2 to 3 punchy bullet points ('key_points') capturing crucial technical details (e.g. CVE numbers, targeted systems, threat groups, mitigation steps).
   - Assign an accurate category tag (e.g. 'Zero-Day Vulnerability', 'Ransomware', 'Supply Chain', 'Espionage', 'Data Breach', 'Cloud Security').
4. ACCURACY: Always use the exact article URL and source name provided in the input list.

INCOMING ARTICLES:
{articles_text}
"""

    print(f"🤖 Sending {len(articles)} raw articles to Gemini (gemini-2.5-flash) for curation & synthesis...")

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CuratedDigest,
                temperature=0.2,
            ),
        )

        if response.text:
            parsed_data = json.loads(response.text)
            digest = CuratedDigest(**parsed_data)
            print(f"✨ Gemini successfully curated {len(digest.items)} top stories!")
            return digest
        else:
            print("⚠️ Empty response from Gemini. Falling back.")
            return fallback_curation(articles, max_items=max_items)

    except Exception as e:
        print(f"⚠️ Error during Gemini AI curation: {e}. Falling back to heuristic curation.")
        return fallback_curation(articles, max_items=max_items)
