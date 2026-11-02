# 📱 GOOGLE PLAY STORE DEPLOYMENT GUIDE - LUDO VOICE KING

This guide provides step-by-step instructions to generate your Android App (`.apk` and `.aab`) and deploy it to the **Google Play Store** so users worldwide can download, play Ludo, and talk over voice chat.

---

## 🏗️ 1. Project Architecture

Your Android app is fully configured using **Capacitor**:
- **Android Native Project Folder**: [`android/`](file:///C:/Users/ramja/.gemini/antigravity/scratch/ludo-voice-game/android)
- **App Package ID**: `com.ludovoice.king`
- **Target SDK**: Android 36 (Compliant with Google Play's 2026 requirements)
- **Microphone & Voice Permissions**: Pre-configured in [`AndroidManifest.xml`](file:///C:/Users/ramja/.gemini/antigravity/scratch/ludo-voice-game/android/app/src/main/AndroidManifest.xml):
  - `RECORD_AUDIO` (For in-game voice chat)
  - `MODIFY_AUDIO_SETTINGS`
  - `INTERNET` & `ACCESS_NETWORK_STATE`
  - `WAKE_LOCK`

---

## ☁️ 2. How to Build the App (2 Methods)

### Method A: Free Automated Cloud Build via GitHub Actions (Recommended)
You do **not** need Android Studio installed on your computer. GitHub will build the APK and Google Play AAB for you for free in the cloud:

1. Create a free repository on [GitHub](https://github.com/new).
2. Push your project to GitHub:
   ```bash
   cd "C:\Users\ramja\.gemini\antigravity\scratch\ludo-voice-game"
   git init
   git add .
   git commit -m "Initial Ludo Voice King Android App"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ludo-voice-game.git
   git push -u origin main
   ```
3. Open your GitHub repository in your browser and click on the **Actions** tab.
4. The workflow **"Build Android APK and AAB for Google Play Store"** will automatically run.
5. In ~2 minutes, click on the completed run:
   - Download **`ludo-voice-king-debug-apk`** to install and test directly on your phone!
   - Download **`ludo-voice-king-release-aab`** to upload directly to the Google Play Console!

---

### Method B: Build Locally using Android Studio
If you install [Android Studio](https://developer.android.com/studio):

1. Open Android Studio.
2. Select **Open an existing project** and choose:
   ```
   C:\Users\ramja\.gemini\antigravity\scratch\ludo-voice-game\android
   ```
3. Wait for Gradle to finish indexing.
4. **To test on your connected Android phone or emulator**:
   - Click the green **Run (▶️)** button.
5. **To generate Google Play Store Release Bundle (`.aab`)**:
   - In the top menu, go to **Build** -> **Generate Signed Bundle / APK...**
   - Select **Android App Bundle** and click **Next**.
   - Create or select your keystore key.
   - Choose **release** destination folder and click **Finish**.
   - The `.aab` file will be generated in `android/app/release/`.

---

## 🌐 3. Deploying the Backend Server for Free

For online multiplayer and voice chat across different phones over mobile data/Wi-Fi, host your Node.js server in the cloud (takes 2 minutes on Render):

### Deploy to Render.com (100% Free):
1. Sign up for free at [render.com](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository (`ludo-voice-game`).
4. Select:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.
6. Render gives you a free HTTPS URL like:
   `https://ludo-voice-king.onrender.com`
7. In the Android App (or via the **🌐 Server: ⚙️** button on the home screen), set this URL as your server address. Now users anywhere in the world can talk and play together!

---

## 🚀 4. Google Play Console Publishing Steps

1. **Sign in to Google Play Console**:
   - Visit [play.google.com/console](https://play.google.com/console).
   - Sign in with your Google account (one-time $25 registration fee for a developer account).

2. **Create New App**:
   - Click **Create App**.
   - **App name**: `Ludo King Voice - Royal Match`
   - **Default language**: English (or Hindi)
   - **App or Game**: Game
   - **Category**: Board
   - **Free or Paid**: Free

3. **Store Listing Details**:
   - **Short description**: *"Classic Ludo King board game with real-time peer-to-peer voice chat, 3D dice, and smart bots!"*
   - **Full description**: Highlight the voice chat feature, room codes, classic safe stars, captures, and bot modes.
   - **App Icon**: 512x512 PNG.
   - **Feature Graphic**: 1024x500 PNG.
   - **Screenshots**: At least 2 phone screenshots of the board and voice toolbar.

4. **App Content & Data Safety**:
   - **Microphone**: Select "Yes, the app accesses microphone for live in-game player voice chat".
   - **Ads / In-app purchases**: Set to No (or Yes if you add AdMob).
   - **Target Age**: 13+ or All ages.

5. **Upload Your App Bundle (`.aab`)**:
   - In the left sidebar, navigate to **Production** (or **Closed testing**).
   - Click **Create new release**.
   - Upload the **`app-release.aab`** file (generated from GitHub Actions or Android Studio).
   - Enter release notes: *"Initial release with real-time WebRTC voice chat and 3D Ludo board."*
   - Click **Next** -> **Save** -> **Start rollout to Production**!

6. **Google Review**:
   - Google usually reviews and approves new apps within 1–3 business days.
   - Once approved, your game will be live on the Google Play Store for millions of users to download!
