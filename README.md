<p align="center">
<img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/ytpro.gif' height=150  >
</p>
<h1 align=center>YT PRO </h1>

<div align="center">


[![Gradle](https://github.com/prateek-chaubey/YTPro/actions/workflows/gradle.yml/badge.svg)](https://github.com/prateek-chaubey/YTPro/actions/workflows/gradle.yml)
<a href="https://www.jsdelivr.com/package/npm/ytpro?tab=stats" ><img alt="jsDelivr monthly hits badge" src="https://data.jsdelivr.com/v1/package/npm/ytpro/badge"></a>
<img src=https://img.shields.io/github/downloads/prateek-chaubey/YTPro/total >

</div>

---

## Über diesen Fork

Angepasst für das **Xiaomi Pad 6 Max 14"** (2880×1800, Dichte 360 → 1280×800 dp
im Querformat, Android 15, Snapdragon 8+ Gen 1).

Upstream lädt fest `m.youtube.com` und hat keinerlei responsives Verhalten —
keine Media Queries, keine Resize-Listener, durchgehend feste Pixelwerte. Auf
einem 14"-Panel ergibt das ein gestrecktes Handy-Layout. Dieser Fork lädt
stattdessen die Desktop-Seite und überbrückt die Lücke mit einer additiven
Injektionsschicht, sodass die Upstream-Skripte unverändert weiterlaufen.

> Der Download-Button weiter oben zeigt auf den Upstream-Build. Für diesen Fork
> gilt der Abschnitt [Bauen](#bauen).

### Was anders ist

- **Desktop-Layout** mit Sidebar und Empfehlungsspalte statt Handy-Ansicht
- **Echtes Vollbild** ohne Android-Status- und Navigationsleiste; Uhrzeit und
  Akkustand stehen als weisse Pille in YouTubes eigener Kopfzeile
- **Icon-Leiste**: die YTPRO-Buttons sitzen ohne Text in YouTubes Aktionszeile
  neben „Abonnieren", YouTubes eigene Labels sind ebenfalls ausgeblendet
  (Like- und Dislike-Zahlen bleiben stehen)
- **Empfehlungen scrollen unabhängig** — das laufende Video bleibt stehen
- **Kommentare zuerst**, die Videobeschreibung liegt hinter einem Umschalter
- **Miniplayer beim Zurückgehen**: die Wiedergabe läuft unten rechts weiter
- **Werbung ausgeblendet**, inklusive des geteilten Inline-Vorschauplayers, über
  den YouTube Videoanzeigen auf echte Kacheln legt
- **Gestenzonen** auf 96 dp begrenzt und distanzbasiert statt an die
  120-Hz-Abtastrate des Digitizers gekoppelt
- **Downloader entfernt**; `innertube.js` wird nicht mehr injiziert

### Nebenbei behobene Fehler

Das Manifest deklarierte einen Receiver in einem Paket, in dem die Klasse nicht
existiert — sämtliche Transportknöpfe der Benachrichtigung waren tot.
`DownloadFromIntentFilter` durchlief `onCreate` zweimal, was zwei Seitenladungen,
einen doppelt registrierten und geleakten Receiver und zwei Thread-Pools ergab.
`MediaMuxerUtils` allozierte einen festen 1-MiB-Sample-Puffer, kleiner als ein
einzelner hochbitratiger 4K-Keyframe. `hasStoragePermission()` lieferte genau
dann `true`, wenn die Berechtigung **verweigert** war. Das Verlassen des
Vollbilds sperrte die Activity dauerhaft ins Hochformat. Beide Laufzeit-Receiver
waren auf ungeschützten impliziten Actions exportiert, und die `MediaSession`
wurde nie freigegeben.

### Aufbau

Der Eingriff bleibt bewusst klein, damit ein Rebase auf Upstream günstig bleibt:

| Datei | Rolle |
|---|---|
| `TabletMode.java` | Grossbildschirm-Erkennung, Desktop-UA, 120 Hz, Asset-Laden |
| `TabletBridge.java` | Akkustand für die Anzeige in der Kopfzeile |
| `assets/ytpro-tablet.js` | DOM-Adapter, CSS-Overrides, Gesten- und Panel-Korrekturen |

Diese drei Dateien sind neu und haben damit keine Merge-Fläche. Alles Übrige
sind einzeilige, mit `YTPRO-TABLET` markierte Patches. Die Dateien unter
`scripts/` sind unverändert.

Der DOM-Adapter ist der einzige wirklich fragile Teil: `script.js` enthält keinen
einzigen `ytd-*`-Selektor, weshalb die 3 IDs, 6 Klassen und 7 `ytm-*`-Tags, die
es erwartet, auf das Desktop-DOM abgebildet werden. YouTube ändert dieses DOM
häufiger als das mobile. Als Rückfallebene lässt sich die Einstellung
`desktopSite` auf `false` setzen, dann verhält sich die App wieder wie Upstream.

<a name="bauen"></a>
### Bauen

Erfordert JDK 17+ und ein Android-SDK mit Platform 36:

```bash
./gradlew assembleRelease
```

```bash
java -jar signer/apksigner.jar sign --key signer/apkeasytool.pk8 --cert signer/apkeasytool.pem --v4-signing-enabled false --out app/build/outputs/apk/release/youtube_pro_signed.apk app/build/outputs/apk/release/app-release-unsigned.apk
```

Die Signatur entspricht der von Upstream, ein `adb install -r` aktualisiert also
eine bestehende Installation, ohne Herz-Liste, Einstellungen oder Anmeldung zu
verlieren.

---

### Become a Sponsor 
---
> [!TIP]
> If you like this project, consider [sponsoring](https://github.com/sponsors/prateek-chaubey) to support the author 🌸
---

## Download YT PRO

[![Download zip](https://custom-icon-badges.herokuapp.com/badge/-Download-ff0000?style=for-the-badge&logo=download&logoColor=white "Download Apk")](https://nightly.link/prateek-chaubey/YTPro/workflows/gradle/main/YTPRO.zip)

#### Screenshots
| | | |
|:--:|:--:|:--:| 
|<img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/screen3.jpg'  > | <img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/screen2.jpg'  > |<img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/screen5.jpg'  > | 
|<img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/screen6.jpg'  > | <img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/screen4.jpg'  > |<img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/screen1.jpg'  > |


## Features
 * <img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/gemini-logo-13486188-10900314-unscreen-ezgif.com-crop.gif' height=15 width=15 > Google Gemini
   * Summarise Vidoes
   * Customisable prompts and models
 * Video Downloader
 * Shorts Downloader
 * In-built Video and Audio Muxer
 * Thumbnails Downloader
 * Captions Downloader
 * Ads Blocker
 * Minimize Video
 * Picture in Picture Mode
 * Gesture control for Volume and Brightness 
 * Shows Number of Dislikes
 * Background Audio Player
 * Custom Heart feature to save videos without logging into your account
 * Enable / disable media codecs
 * Skip Sponsers
 * Force Zoom
 * Hide Shorts
 * Upto 10x video speed 
 * Minimal APK size
 * Adaptive UI icons
 * Minimal
 * Almost 0 Internal Dependencies
 * Auto Updation of App


## Gemini Prompt
The available variables for gemini prompt are
* `{url}` : The URL of the video
* `{title}` : Title of the video
* `{videoId}` : Video Id of the video

## ToDo
 * Enhance Audio
 * Skip Silence 
 

### Credits
 * [Sponsor Block](https://github.com/ajayyy/SponsorBlock)
 * [return-youtube-dislike](https://github.com/Anarios/return-youtube-dislike)
 * [YouTube.js](https://github.com/LuanRT/YouTube.js/)

### ❤️Supporters❤️
[![Stargazers repo roster for @prateek-chaubey/YTPro](http://reporoster.com/stars/dark/prateek-chaubey/YTPro)](https://github.com/prateek-chaubey/YTPro/stargazers)
     
[![Forkers repo roster for @prateek-chaubey/YTPro](http://reporoster.com/forks/dark/prateek-chaubey/YTPro)](https://github.com/prateek-chaubey/YTPro/network/members)


## Disclaimer 
This is an educational project aimed at showcasing javascript injection into a webview to enhance productivity.
