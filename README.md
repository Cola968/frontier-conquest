# FRONTIER — Global Conquest v2.0

Ein eigenständiges PC-orientiertes Echtzeit-Eroberungsspiel im Browser. Inspiriert vom Genre von **Territorial.io** und **OpenFront.io**. Keine fremden Assets, Maps oder kopierten Quelltexte.

**Direkt spielen:** https://cola968.github.io/frontier-conquest/

## Das ist implementiert

- Zwei unterschiedliche **prozedural generierte Karten**: Kontinente und Archipel.
- **Startposition selbst wählen**, anschließend 7 / 11 / 15 KI-Nationen je nach Schwierigkeit.
- **Nicht-instantane Eroberung**: Angriffe erstellen Kampfverbände; diese kämpfen sich entlang der Front durch Land.
- **Ressourcenökonomie**: Flächengröße bestimmt Armeeproduktion und Truppenkapazität. Offensive bindet Truppen.
- **Verteidiger** verlieren bei Angriffen Armee. Berge und Befestigungen erhöhen die Eroberungskosten.
- **Seeinvasionen** mit benötigter Küste, Transportkosten, Fahrzeit und Landung – notwendig, um isolierte Kontinente erreichen zu können.
- **KI** expandiert, greift Gegner an und kann übers Meer angreifen.
- Zoom/Pan, **Minikarte**, Rangliste, Länderinformationen, Ereignislog, Geschwindigkeit, Pause, Vollbild und neuer Spielstart.
- Eine **Singleplayer-Partie** ist lokal im Browser spielbar, ohne Backend und ohne Konto.

## PC-Steuerung

| Aktion | Steuerung |
| --- | --- |
| Land angreifen | **1** und Linksklick auf feindliches oder neutrales Land |
| In unbesetztes Land expandieren | **2** |
| Eigenes Gebiet befestigen | **3**, Linksklick auf eigenes Land (180 Truppen/Stufe) |
| Seeinvasion | **4**, Ziel an anderer Küste anklicken |
| Karte verschieben | Linke Maustaste ziehen, rechte Maustaste ziehen, **WASD** oder Pfeiltasten |
| Zoomen | Mausrad, **+**, **-**, Steuerelemente unter der Karte |
| Gesamte Karte anzeigen | Taste unter der Karte **⛶** |
| Pause | **Leertaste** |
| Vollbild | **F** |
| Spielgeschwindigkeit | Knopf **1× / 2×** |
| Truppenanteil | Regler **10–90%** links |

### So funktioniert die Eroberung

1. Partie starten und auf eine freie Landfläche klicken.
2. Eigene Truppen werden fortlaufend produziert; zu Beginn lohnt sich Expansion ins neutrale Gebiet.
3. Jedes Angriffskommando reserviert den am Schieberegler gewählten Teil der Truppen.
4. Der Verband rückt in mehreren Simulationsschritten vor. Neutrales Land kostet weniger als besetztes Land.
5. Eine Offensive endet, wenn ihr die Truppen ausgehen oder das Zielgebiet ausgeschöpft ist. Ein Teil der verbleibenden Truppen kehrt zurück.
6. Für eine Landung über das Meer ist eine eigene Küste, eine fremde Küste und genug Armee nötig. **220 Truppen** gehen in Transportkosten, die Landung braucht mehrere Sekunden.

## Lokal starten

Die drei Dateien **index.html**, **styles.css** und **game.js** in einen Ordner legen und **index.html** per Doppelklick mit Chrome, Firefox oder Edge öffnen.

Optional aus dem Repo-Verzeichnis:

```bash
python -m http.server 8000
```

Danach http://localhost:8000 öffnen. Alternativ kann man die Site direkt über GitHub Pages spielen.

## Tests

Ohne Installation externer Dependencies:

```bash
node --test tests/smoke.test.cjs
```

Der Smoke-Test prüft die Startsequenz, KI-Erstellung, Wirtschafts-Ticks und Gebietseroberung in einer vereinfachten DOM-/Canvas-Testumgebung. **Er ersetzt keinen Browser- oder Balancing-Test.**

## Grenzen der aktuellen Version

- **Noch kein Online-Multiplayer.** Die KI ist regelbasiert und nicht mit menschlichen Gegnern vergleichbar.
- Die Karte ist stilisiert und **keine maßstabsgetreue Karte realer Landesgrenzen**.
- Keine Städte, Flugzeuge, diplomatischen Bündnisse oder separate Marineflotten mit Produktionsketten.
- Balancing, Browserkompatibilität und große Partien brauchen weitere Tests und Optimierung.
- Keine Speicherung einer begonnenen Partie; Neustart setzt den Spielstand zurück.

## Weitere sinnvolle Entwicklung

1. Gameplay-Balance mit messbaren Erfolgsraten und KI-Gegenstrategien.
2. Optimierter Kartenrenderer, bessere Küsten- und Grenzschattierung.
3. Wirtschaftspunkte, Häfen, Rekrutierungsregionen und befestigte Städte.
4. Autoritativer Multiplayer-Server mit Matchmaking und Replay-Log.
5. Persistente Spielstände, Einstellungen und reaktionsfähige Musik/Soundeffekte.

**Technik:** HTML5 Canvas, Vanilla JavaScript und CSS. Statische GitHub-Pages-Auslieferung.
