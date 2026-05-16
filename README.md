# Atlantis Energy Flow Card

Custom Lovelace-Karte für Home Assistant.  
Zeigt den Energiefluss **Solar → Batterie 1+2 → Batterie 3 → Shelly** mit SOC-Balken, Leistung (W) und Restenergie.

![Vorschau](preview.png)

## Installation

### HACS (empfohlen)

1. HACS öffnen → **Frontend** → **+ Erkunden & Herunterladen**
2. „Atlantis Energy Flow" suchen → Herunterladen
3. Home Assistant neu laden (F5)

### Manuell

1. `atlantis-energy-card.js` nach `/config/www/atlantis-energy-card.js` kopieren
2. **Einstellungen → Dashboards → Ressourcen** → `+`
   - URL: `/local/atlantis-energy-card.js`
   - Typ: JavaScript-Modul
3. Home Assistant neu laden

## Karte hinzufügen

Dashboard bearbeiten → Karte hinzufügen → **Benutzerdefinierte Karten** → `atlantis-energy-card`

Oder manuell im YAML-Editor:

```yaml
type: custom:atlantis-energy-card
title: Energiefluss
solar_power: sensor.solar_power_w
battery12_soc: sensor.batterie_12_soc
battery12_power: sensor.batterie_12_power_w
battery12_remaining: sensor.batterie_12_remaining_wh
battery12_capacity: 10
battery3_soc: sensor.batterie_3_soc
battery3_power: sensor.batterie_3_power_w
battery3_remaining: sensor.batterie_3_remaining_wh
battery3_capacity: 5
shelly_power: sensor.shelly_power_w
```

## Konfiguration

| Option | Typ | Beschreibung |
|---|---|---|
| `title` | Text | Kartentitel (Standard: „Energiefluss") |
| `solar_power` | Sensor | Solarleistung in W |
| `battery12_soc` | Sensor | SOC Batterie 1+2 in % |
| `battery12_power` | Sensor | Leistung Batterie 1+2 in W (+ = laden, − = entladen) |
| `battery12_remaining` | Sensor | Restenergie Batterie 1+2 (Wh oder kWh) |
| `battery12_capacity` | Zahl | Kapazität Batterie 1+2 in kWh (für %-Anzeige) |
| `battery3_soc` | Sensor | SOC Batterie 3 in % |
| `battery3_power` | Sensor | Leistung Batterie 3 in W |
| `battery3_remaining` | Sensor | Restenergie Batterie 3 (Wh oder kWh) |
| `battery3_capacity` | Zahl | Kapazität Batterie 3 in kWh |
| `shelly_power` | Sensor | Shelly-Verbrauch in W |

## SOC-Farben

| SOC | Farbe |
|---|---|
| ≥ 75 % | 🟢 Grün |
| ≥ 50 % | 🟡 Gelbgrün |
| ≥ 25 % | 🟠 Orange |
| < 25 % | 🔴 Rot |

## Leistungsanzeige

- **▲** = Laden / Einspeisung (grün)
- **▼** = Entladen / Verbrauch (orange)
- Animierte Pfeile zeigen die aktuelle Flussrichtung

## Lizenz

MIT License
