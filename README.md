# 🛡️ Morning News: Automated Cyber Security Intelligence Brief

Een geautomatiseerde nieuwsbrief-engine die dagelijks de belangrijkste cybersecurity-berichten screent via toonaangevende RSS-feeds, deze met Google Gemini AI analyseert en filtert tot een top 10 overzicht, en dit als een professionele HTML-e-mail verstuurt via Gmail SMTP en GitHub Actions.

---

## 🚀 Kenmerken

- **Top Bronnen**: Standaard geconfigureerd met *The Hacker News*, *BleepingComputer*, *Krebs on Security*, *Dark Reading* en *SecurityWeek*.
- **AI Curatie & Deduplicatie**: Google Gemini (`gemini-2.5-flash`) detecteert dubbele meldingen van hetzelfde incident over verschillende media, kiest de top 10 meest impactvolle verhalen en genereert bondige Engelstalige samenvattingen met kernpunten.
- **Moderne HTML E-mail**: Volledig responsief, categorie-labels, dark mode compatibiliteit en directe koppelingen naar het volledige artikel online (inclusief plain-text fallback).
- **100% Gratis & Serverless**: Geen webservers of externe cron-diensten nodig. Draait via GitHub Actions en de gratis Google Gemini API tier.
- **Lokale Preview**: Eenvoudig lokaal te testen via `--dry-run` met automatische gegenereerde `preview.html`.

---

## 📋 Benodigdheden

1. **Google Gemini API Key** (gratis):
   - Ga naar [Google AI Studio](https://aistudio.google.com/).
   - Klik op **Get API key** en kopieer je sleutel.
2. **Gmail App Wachtwoord**:
   - Ga naar je [Google-accountbeveiliging](https://myaccount.google.com/security).
   - Zorg dat **2-stapsverificatie** aan staat.
   - Zoek naar **App-wachtwoorden** (of ga direct naar [Google App Passwords](https://myaccount.google.com/apppasswords)).
   - Maak een app-wachtwoord aan (bijv. "Morning News") en kopieer de 16-karakterige code.

---

## 💻 Lokaal Gebruik & Testen

### 1. Installatie
```bash
# Kloon de repo of ga naar de projectmap
cd morning_news

# Installeer dependencies
pip install -r requirements.txt
```

### 2. Configureer `.env`
Kopieer `.env.example` naar `.env`:
```bash
cp .env.example .env
```
Vul je eigen gegevens in:
```ini
GEMINI_API_KEY=AIzaSy...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jouw_email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM="CyberSec Brief <jouw_email@gmail.com>"
EMAIL_TO=ontvanger@example.com
```

### 3. Uitvoeren

- **Droogloop (zonder e-mail te sturen, genereert `preview.html`)**:
  ```bash
  python main.py --dry-run
  ```
  Open `preview.html` in je browser om direct het resultaat te bekijken!

- **Test e-mail direct versturen**:
  ```bash
  python main.py
  ```

---

## ⚙️ Automatisch dagelijks uitvoeren via GitHub Actions

Het script bevat al een complete workflow in [`.github/workflows/daily_newsletter.yml`](.github/workflows/daily_newsletter.yml) die elke ochtend om **06:00 UTC** (07:00 CET) draait.

### Repository Secrets instellen:
1. Push deze repository naar jouw persoonlijke GitHub account (mag een **Private Repository** zijn).
2. Ga in je GitHub repo naar: **Settings** > **Secrets and variables** > **Actions**.
3. Voeg de volgende **Repository secrets** toe:

| Secret Naam | Waarde / Beschrijving |
|---|---|
| `GEMINI_API_KEY` | Je Google Gemini API Key |
| `SMTP_USER` | Jouw Gmail-adres (bijv. `jouwnaam@gmail.com`) |
| `SMTP_PASS` | Het 16-karakterige Gmail App-wachtwoord |
| `EMAIL_TO` | Het e-mailadres waar je de nieuwsbrief op wil ontvangen |
| `EMAIL_FROM` | *(Optioneel)* Afzenderlabel, bv. `"CyberSec Brief <jouwnaam@gmail.com>"` |
| `SMTP_HOST` | *(Optioneel, standaard `smtp.gmail.com`)* |
| `SMTP_PORT` | *(Optioneel, standaard `587`)* |

### Handmatig testen in GitHub:
Ga in je GitHub repository naar het tabblad **Actions** > **Daily Cyber Security Newsletter** > klik op **Run workflow**.

---

## 🛠️ Aanpassen van feeds en onderwerpen

Feeds en instellingen beheer je eenvoudig in [`config/feeds.yaml`](config/feeds.yaml):

```yaml
topics:
  cyber_security:
    name: "Cyber Security"
    max_items: 10
    lookback_hours: 36
    feeds:
      - name: "The Hacker News"
        url: "https://feeds.feedburner.com/TheHackersNews"
      - name: "BleepingComputer"
        url: "https://www.bleepingcomputer.com/feed/"
      - name: "Krebs on Security"
        url: "https://krebsonsecurity.com/feed/"
      - name: "Dark Reading"
        url: "https://www.darkreading.com/rss.xml"
      - name: "SecurityWeek"
        url: "https://www.securityweek.com/feed/"
```
Je kunt hier op elk gewenst moment feeds toevoegen of verwijderen, of zelfs nieuwe onderwerpen (zoals `artificial_intelligence`) aan toevoegen!
