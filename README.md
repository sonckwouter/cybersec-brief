# 🛡️ CyberSec Brief: Automated Intelligence Engine & Android PWA

Een geautomatiseerde nieuwsbrief- en mobiele webapp-engine die dagelijks de belangrijkste cybersecurity-berichten screent via toonaangevende RSS-feeds, deze met Google Gemini AI analyseert en filtert tot een top 10 overzicht, en dit publiceert als een **Progressive Web App (PWA)** voor je Android telefoon via **GitHub Pages**.

---

## 📱 Kenmerken van de Android Web App (PWA)

- **Installeerbaar op Android**: Te installeren via Google Chrome als zelfstandige app op je startscherm, opent **full-screen zonder browserbalk**.
- **Volledig Offline Beschikbaar**: Dankzij de ingebouwde Service Worker (`sw.js`) kun je de editie van de dag altijd direct lezen, ook in de trein of zonder internetbereik.
- **Top Bronnen**: *The Hacker News*, *BleepingComputer*, *Krebs on Security*, *Dark Reading* en *SecurityWeek*.
- **AI Curatie & Deduplicatie**: Google Gemini (`gemini-2.5-flash`) detecteert dubbele meldingen over hetzelfde incident, selecteert de top 10 en genereert bondige Engelstalige takeaways.
- **Interactieve Mobiele Functies**:
  - 🎯 **Today's Focus**: Belangrijkste trend van de dag direct in beeld.
  - 🏷️ **Categoriefilters**: Filter direct op bijv. *Vulnerability*, *Ransomware*, *Data Breach*.
  - ★ **Bladwijzers**: Bewaar interessante artikelen lokaal via `LocalStorage`.
  - 🌓 **Dark & Light Mode**: Schakel eenvoudig tussen een strakke donkere of lichte weergave.
- **100% Gratis & Serverless**: Geen servers of hostingkosten. Draait volledig op GitHub Actions en GitHub Pages.

---

## 🚀 Wat moet je instellen op GitHub? (Stap-voor-stap)

Volg deze eenvoudige stappen om de app live te zetten:

### Stap 1: Repository aanmaken en code pushen
1. Maak een nieuwe repository aan op je [GitHub-account](https://github.com/new) (bijv. genaamd `morning_news` of `cybersec-brief`). Deze mag **Private** of **Public** zijn.
2. Push je lokale code naar GitHub:
   ```bash
   git remote add origin https://github.com/<jouw-gebruikersnaam>/<jouw-repo>.git
   git branch -M main
   git push -u origin main
   ```

---

### Stap 2: GitHub Pages aanzetten
1. Ga in je GitHub repository naar **Settings** (bovenste menubalk).
2. Klik in het linkermenu op **Pages** (onder *Code and automation*).
3. Kijk bij **Build and deployment** > **Source**:
   - Wijzig dit van *"Deploy from a branch"* naar: **GitHub Actions**.
   *(GitHub zorgt nu automatisch voor de HTTPS-hosting van de map `docs/`!)*

---

### Stap 3: Gemini API Key toevoegen aan GitHub Secrets
Je hebt alleen een (gratis) Gemini API key nodig:
1. Maak een gratis key aan via [Google AI Studio](https://aistudio.google.com/) (klik op **Get API key**).
2. Ga in je GitHub repo naar: **Settings** > **Secrets and variables** > **Actions**.
3. Klik op **New repository secret**:
   - **Name**: `GEMINI_API_KEY`
   - **Secret**: *plak je gekopieerde Gemini API-sleutel*
4. Klik op **Add secret**.

*(Optioneel: wil je toch e-mails ontvangen? Voeg dan ook `SMTP_USER`, `SMTP_PASS` en `EMAIL_TO` toe).*

---

### Stap 4: De eerste editie bouwen (Workflow testen)
1. Ga in je repository naar het tabblad **Actions**.
2. Klik aan de linkerkant op **Daily Cyber Security Brief & PWA**.
3. Klik aan de rechterkant op de knop **Run workflow** > selecteer branch `main` > klik op de groene **Run workflow** knop.
4. Binnen circa 1 minuut is de workflow klaar.
5. Ga terug naar **Settings** > **Pages**: daar zie je jouw persoonlijke live URL, bijvoorbeeld:
   `https://<jouw-gebruikersnaam>.github.io/<jouw-repo>/`

---

### Stap 5: Installeren op je Android Telefoon
1. Open de GitHub Pages URL op je Android telefoon in **Google Chrome**.
2. Tik rechtsboven op het menu (de **3 puntjes** ⋮).
3. Tik op **"Toevoegen aan startscherm"** (of **"App installeren"**).
4. Er verschijnt nu een **CyberSec Brief** app-icoon tussen al je andere apps op je telefoon!
5. Elke ochtend om 07:00 / 08:00 CET draait GitHub Actions automatisch en staat de nieuwste top 10 voor je klaar zodra je de app opent.

---

## 💻 Lokaal testen op je computer

Wil je de app eerst lokaal bekijken?
1. Open eenvoudig het bestand [`docs/index.html`](docs/index.html) in je browser, of draai een lokale testserver:
   ```bash
   python -m http.server 8000 -d docs
   ```
   Open `http://localhost:8000` in je browser om de mobiele weergave en filters te testen.
2. Om handmatig nieuwe data op te halen en de feed te genereren:
   ```bash
   python main.py --dry-run
   ```
