"""Configuration management for Morning News."""

import os
from pathlib import Path
from typing import Dict, List, Optional
import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load environment variables from .env file if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


class FeedConfig(BaseModel):
    name: str
    url: str


class TopicConfig(BaseModel):
    name: str
    description: str = ""
    max_items: int = 10
    lookback_hours: int = 36
    feeds: List[FeedConfig] = Field(default_factory=list)


class AppConfig(BaseModel):
    # API & Service credentials
    gemini_api_key: Optional[str] = None
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    email_from: Optional[str] = None
    email_to: Optional[str] = None
    default_topic: str = "cyber_security"
    topics: Dict[str, TopicConfig] = Field(default_factory=dict)


def load_config(feeds_yaml_path: Optional[Path] = None) -> AppConfig:
    """Loads configuration combining environment variables and feeds.yaml."""
    if feeds_yaml_path is None:
        feeds_yaml_path = BASE_DIR / "config" / "feeds.yaml"

    topics_dict: Dict[str, TopicConfig] = {}
    if feeds_yaml_path.exists():
        with open(feeds_yaml_path, "r", encoding="utf-8") as f:
            raw_data = yaml.safe_load(f) or {}
            raw_topics = raw_data.get("topics", {})
            for key, val in raw_topics.items():
                topics_dict[key] = TopicConfig(**val)

    smtp_user = os.getenv("SMTP_USER")
    email_from = os.getenv("EMAIL_FROM") or (smtp_user if smtp_user else "Morning News <noreply@example.com>")

    return AppConfig(
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
        smtp_host=os.getenv("SMTP_HOST", "smtp.gmail.com"),
        smtp_port=int(os.getenv("SMTP_PORT", "587")),
        smtp_user=smtp_user,
        smtp_pass=os.getenv("SMTP_PASS"),
        email_from=email_from,
        email_to=os.getenv("EMAIL_TO"),
        default_topic=os.getenv("DEFAULT_TOPIC", "cyber_security"),
        topics=topics_dict,
    )
