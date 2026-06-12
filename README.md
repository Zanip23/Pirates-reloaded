# Black Tide Trader

Ein Retro-Piraten-Handelsspiel in Pixel-Art, gebaut mit Phaser 3.
Helle Karibik, eine Steuerung für alles, echte Seeschlachten auf offener See.

## Installation

```bash
npm install
```

## Start (Dev-Server)

```bash
npm run dev
```

Dann `http://localhost:5173` im Browser öffnen.

## Produktions-Build

```bash
npm run build
npm run preview
```

## Steuerung — eine für alles

- **Tippe oder klicke aufs Meer** — das Schiff segelt dorthin (PC und Handy identisch)
- **Tippe auf einen Hafen** (oder den ANLEGEN-Knopf), wenn du nah genug bist
- Im Kampf gilt dieselbe Steuerung: **segeln = ausweichen**, die Kanonen
  feuern automatisch, sobald ein Feind in Reichweite ist
- Pfeiltasten/WASD funktionieren am PC als stille Alternative

## Spielprinzip: Risiko nach Wahl

Die Karte ist in drei Zonen geteilt — je weiter östlich, desto gefährlicher
und desto fetter die Gewinne:

| Zone | Gefahr | Häfen |
|---|---|---|
| Heimatgewässer | keine Piraten | Port Haven, Kingsport |
| Offene See | Freibeuter & Korsaren | Redreef, San Cordoba, Isla Verde |
| Schwarze Weiten | Schwarze Galeonen, Stürme | Blackwater Cay, Sturmfels |

1. Kaufe Waren günstig dort, wo sie produziert werden (★ GÜNSTIG)
2. Verkaufe sie mit Gewinn dort, wo sie gebraucht werden (▲ GUTER PREIS)
3. Investiere Gold in der **Werft**: Rumpf, Kanonen, Segel, Frachtraum
4. Heuere in der **Taverne** Crew an und halte die Moral hoch
5. Wage dich nach Osten: Edelsteine aus Sturmfels machen reich —
   wenn du die Rückfahrt überlebst

In Sichtweite eines Hafens bist du vor Piraten sicher. Sinkt dein Schiff,
ist das Spiel nicht vorbei: Du verlierst Fracht und einen Teil deines Goldes
und strandest in Port Haven.

## Speichern

Das Spiel speichert automatisch in `localStorage` (beim Anlegen, nach Kämpfen,
bei Tageswechseln). „Weiterspielen" im Titelbildschirm setzt die Reise fort.

## Technik

- Alle Grafiken werden zur Laufzeit prozedural als Pixel-Art erzeugt
  (`src/textures.js`) — keine externen Assets
- Kein Audio (bewusst weggelassen, keine kaputten Platzhalter)
- Szenen: Boot → Menü → Spiel (+ Hafen-Overlay)
