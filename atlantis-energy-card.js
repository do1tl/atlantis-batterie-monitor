/**
 * Atlantis Batterie Monitor
 * Energiefluss: Solar → Batterie 1 + Batterie 2 (untereinander) → Batterie 3 → Hoymiles → Shelly
 * https://github.com/do1tl/atlantis-batterie-monitor
 */

// ── Konfigurationsfelder ──────────────────────────────────────────────────────

const FIELDS = [
  { key: 'title',              label: 'Kartentitel',                      type: 'text'   },
  { key: 'solar_power',        label: '☀️  Solar – Leistung (W)',          type: 'entity' },

  { key: 'battery1_soc',       label: '🔋  Batterie 1 – SOC (%)',          type: 'entity' },
  { key: 'battery1_power',     label: '🔋  Batterie 1 – Leistung (W)',     type: 'entity' },
  { key: 'battery1_remaining', label: '🔋  Batterie 1 – Restenergie',      type: 'entity' },
  { key: 'battery1_capacity',  label: '🔋  Batterie 1 – Kapazität (kWh)',  type: 'number' },

  { key: 'battery2_soc',       label: '🔋  Batterie 2 – SOC (%)',          type: 'entity' },
  { key: 'battery2_power',     label: '🔋  Batterie 2 – Leistung (W)',     type: 'entity' },
  { key: 'battery2_remaining', label: '🔋  Batterie 2 – Restenergie',      type: 'entity' },
  { key: 'battery2_capacity',  label: '🔋  Batterie 2 – Kapazität (kWh)',  type: 'number' },

  { key: 'battery3_soc',       label: '🔋  Batterie 3 – SOC (%)',          type: 'entity' },
  { key: 'battery3_power',     label: '🔋  Batterie 3 – Leistung (W)',     type: 'entity' },
  { key: 'battery3_remaining', label: '🔋  Batterie 3 – Restenergie',      type: 'entity' },
  { key: 'battery3_capacity',  label: '🔋  Batterie 3 – Kapazität (kWh)',  type: 'number' },

  { key: 'hoymiles_power',     label: '⚡  Hoymiles – Leistung (W)',       type: 'entity' },

  { key: 'shelly_power',       label: '🏠  Shelly – Leistung (W)',         type: 'entity' },
];

// ── Editor ────────────────────────────────────────────────────────────────────

class AtlantisEnergyCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass   = null;
    this._built  = false;
  }

  setConfig(config) {
    this._config = { ...config };
    if (this._built) this._updateValues();
    else this._build();
  }

  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = hass; });
  }

  _build() {
    this._built = true;
    this.style.cssText = 'display:block;padding:4px 0';

    const sep = (label) =>
      `<div style="font-size:11px;font-weight:700;letter-spacing:2px;
                   text-transform:uppercase;color:var(--primary-color);
                   margin:14px 0 6px;border-bottom:1px solid var(--divider-color);
                   padding-bottom:4px">${label}</div>`;

    this.innerHTML =
      sep('Allgemein') +
      this._fieldHtml(FIELDS[0]) +
      sep('☀️ Solar') +
      this._fieldHtml(FIELDS[1]) +
      sep('🔋 Batterie 1') +
      FIELDS.slice(2, 6).map(f => this._fieldHtml(f)).join('') +
      sep('🔋 Batterie 2') +
      FIELDS.slice(6, 10).map(f => this._fieldHtml(f)).join('') +
      sep('🔋 Batterie 3') +
      FIELDS.slice(10, 14).map(f => this._fieldHtml(f)).join('') +
      sep('⚡ Hoymiles') +
      this._fieldHtml(FIELDS[14]) +
      sep('🏠 Shelly') +
      this._fieldHtml(FIELDS[15]);

    this._updateValues();
    this._attachListeners();
  }

  _fieldHtml(f) {
    const inputStyle = `width:100%;padding:6px 8px;border:1px solid var(--divider-color);
                        border-radius:6px;background:var(--card-background-color);
                        color:var(--primary-text-color);font-size:13px;box-sizing:border-box`;
    const label = `<label style="display:block;font-size:11px;font-weight:600;
                                  margin-bottom:3px;color:var(--secondary-text-color)">
                     ${f.label}</label>`;
    let input = '';
    if (f.type === 'entity') {
      input = `<ha-entity-picker data-key="${f.key}" allow-custom-entity></ha-entity-picker>`;
    } else if (f.type === 'number') {
      input = `<input type="number" data-key="${f.key}" step="0.1" min="0" style="${inputStyle}">`;
    } else {
      input = `<input type="text" data-key="${f.key}" style="${inputStyle}">`;
    }
    return `<div style="margin-bottom:10px">${label}${input}</div>`;
  }

  _updateValues() {
    FIELDS.forEach(f => {
      const el = this.querySelector(`[data-key="${f.key}"]`);
      if (!el) return;
      if (f.type === 'entity') {
        el.value = this._config[f.key] || '';
        if (this._hass) el.hass = this._hass;
      } else {
        el.value = this._config[f.key] !== undefined ? this._config[f.key] : '';
      }
    });
  }

  _attachListeners() {
    FIELDS.forEach(f => {
      const el = this.querySelector(`[data-key="${f.key}"]`);
      if (!el) return;
      el.addEventListener(f.type === 'entity' ? 'value-changed' : 'change', e => {
        const val = f.type === 'entity' ? e.detail.value
                  : f.type === 'number' ? (parseFloat(e.target.value) || 0)
                  : e.target.value;
        this._config = { ...this._config, [f.key]: val };
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: this._config }, bubbles: true, composed: true,
        }));
      });
    });
  }
}

customElements.define('atlantis-energy-card-editor', AtlantisEnergyCardEditor);

// ── Hauptkarte ────────────────────────────────────────────────────────────────

class AtlantisEnergyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getConfigElement() {
    return document.createElement('atlantis-energy-card-editor');
  }

  static getStubConfig() {
    return {
      title:               'Energiefluss',
      solar_power:         '',
      battery1_soc:        '', battery1_power: '', battery1_remaining: '', battery1_capacity: 5,
      battery2_soc:        '', battery2_power: '', battery2_remaining: '', battery2_capacity: 5,
      battery3_soc:        '', battery3_power: '', battery3_remaining: '', battery3_capacity: 5,
      hoymiles_power:      '',
      shelly_power:        '',
    };
  }

  setConfig(config) { this._config = config; this._render(); }
  set hass(hass)    { this._hass   = hass;   this._render(); }

  // ── Hilfsfunktionen ────────────────────────────────────────────────────────

  _val(key) {
    if (!this._hass || !this._config?.[key]) return null;
    const s = this._hass.states[this._config[key]];
    return s ? parseFloat(s.state) : null;
  }

  _unit(key) {
    if (!this._hass || !this._config?.[key]) return '';
    const s = this._hass.states[this._config[key]];
    return s?.attributes?.unit_of_measurement || '';
  }

  _fmt(val, unit) {
    if (val === null || isNaN(val)) return '–';
    const u = (unit || '').trim();
    if (u === 'kWh') return val.toFixed(2) + ' kWh';
    if (u === 'Wh')  return Math.abs(val) >= 1000 ? (val/1000).toFixed(2)+' kWh' : val.toFixed(0)+' Wh';
    if (u === 'W')   return Math.abs(val) >= 1000 ? (val/1000).toFixed(1)+' kW'  : val.toFixed(0)+' W';
    if (u === '%')   return val.toFixed(1) + ' %';
    return val.toFixed(1) + (u ? ' '+u : '');
  }

  _socColor(v) {
    if (v === null) return '#555';
    if (v >= 75) return '#00c853';
    if (v >= 50) return '#aeea00';
    if (v >= 25) return '#ffab00';
    return '#ff3d00';
  }

  _pwrColor(w) {
    if (w === null) return 'var(--secondary-text-color)';
    if (w >  10) return '#00c853';
    if (w < -10) return '#ff6d00';
    return 'var(--secondary-text-color)';
  }

  _pwrLabel(w) {
    if (w === null) return '–';
    const sign = w > 10 ? '▲ ' : w < -10 ? '▼ ' : '';
    return sign + this._fmt(Math.abs(w), 'W');
  }

  _remLabel(remKey, capKey) {
    const rem = this._val(remKey);
    const cap = this._config?.[capKey] || null;
    const u   = this._unit(remKey);
    if (rem === null) return null;
    const remKwh = u === 'Wh' ? rem / 1000 : rem;
    const pct = cap ? ` (${((remKwh / cap) * 100).toFixed(0)}%)` : '';
    return this._fmt(rem, u) + pct;
  }

  // ── Battery-Cell HTML (für Bat-Zeile nebeneinander) ───────────────────────

  _batCell(label, socKey, pwrKey, remKey, capKey) {
    const soc = this._val(socKey);
    const pwr = this._val(pwrKey);
    const rem = this._remLabel(remKey, capKey);

    return `
      <div class="bat-cell">
        <div class="bat-header">
          <span class="bat-icon">🔋</span>
          <span class="bat-label">${label}</span>
          ${soc !== null
            ? `<span class="bat-val" style="margin-left:auto;color:${this._socColor(soc)}">${soc.toFixed(1)} %</span>`
            : ''}
        </div>
        ${soc !== null ? `
          <div class="soc-wrap">
            <div class="soc-fill" style="width:${Math.min(100,soc)}%;background:${this._socColor(soc)}"></div>
          </div>
        ` : ''}
        <div class="bat-vals">
          <div class="bat-val" style="color:${this._pwrColor(pwr)}">${this._pwrLabel(pwr)}</div>
          ${rem ? `<div class="bat-small">${rem}</div>` : ''}
        </div>
      </div>`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _render() {
    if (!this._config) return;

    const title   = this._config.title || 'Energiefluss';
    const solarW  = this._val('solar_power');
    const b1W     = this._val('battery1_power');
    const b2W     = this._val('battery2_power');
    const b3W     = this._val('battery3_power');
    const b3Soc     = this._val('battery3_soc');
    const hoymilesW = this._val('hoymiles_power');
    const shellyW   = this._val('shelly_power');

    const arrowActive = (w) =>
      w !== null && w >  10 ? 'active'   :
      w !== null && w < -10 ? 'discharge': '';

    const b3rem = this._remLabel('battery3_remaining','battery3_capacity');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        ha-card { padding: 14px 16px 16px; }

        .card-title {
          font-size: 12px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: var(--secondary-text-color);
          margin-bottom: 12px;
        }

        /* ── Vertikaler Fluss ── */
        .flow {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* ── Node (volle Breite) ── */
        .node {
          background: var(--ha-card-background, var(--card-background-color));
          border: 1px solid var(--divider-color, rgba(128,128,128,0.2));
          border-radius: 12px;
          padding: 10px 14px;
        }

        /* Einzel-Node: Icon + Name links, Werte rechts */
        .single-node {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .node-icon-big { font-size: 26px; line-height: 1; flex-shrink: 0; }
        .node-label {
          font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: var(--secondary-text-color);
        }
        .node-vals {
          margin-left: auto;
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .node-val   { font-size: 14px; font-weight: 600; line-height: 1.5; }
        .node-small { font-size: 10px; color: var(--secondary-text-color); }

        /* ── Bat-Zeile: Bat1 + Bat2 nebeneinander ── */
        .bat-row {
          display: flex;
          gap: 8px;
        }
        .bat-cell {
          flex: 1;
          border: 1px solid var(--divider-color, rgba(128,128,128,0.2));
          border-radius: 12px;
          padding: 10px 10px 8px;
          background: var(--ha-card-background, var(--card-background-color));
        }
        .bat-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        .bat-icon  { font-size: 20px; line-height: 1; }
        .bat-label {
          font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: var(--secondary-text-color);
        }
        .bat-vals  { display: flex; flex-direction: column; gap: 1px; }
        .bat-val   { font-size: 13px; font-weight: 600; line-height: 1.5; }
        .bat-small { font-size: 10px; color: var(--secondary-text-color); }

        /* ── SOC-Balken ── */
        .soc-wrap {
          width: 100%; background: rgba(128,128,128,0.2);
          border-radius: 3px; height: 6px; overflow: hidden; margin: 3px 0 4px;
        }
        .soc-fill { height: 100%; border-radius: 3px; transition: width .6s; }

        /* ── Pfeil (vertikal) ── */
        .arrow-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 2px 0;
        }
        .arrow {
          font-size: 18px; color: var(--secondary-text-color);
          animation: pulse 2s ease-in-out infinite;
        }
        .arrow.active    { color: #00c853; }
        .arrow.discharge { color: #ff6d00; }
        @keyframes pulse {
          0%,100% { opacity:.3; } 50% { opacity:.9; }
        }

        .updated {
          text-align: right; font-size: 10px;
          color: var(--secondary-text-color); opacity: .5; margin-top: 10px;
        }
      </style>

      <ha-card>
        <div class="card-title">${title}</div>

        <div class="flow">

          <!-- ☀️ Solar -->
          <div class="node single-node">
            <div class="node-icon-big">☀️</div>
            <div class="node-label">Solar</div>
            <div class="node-vals">
              <div class="node-val" style="color:${solarW > 0 ? '#ffab00' : 'inherit'}">
                ${this._fmt(solarW, 'W')}
              </div>
            </div>
          </div>

          <!-- ↓ -->
          <div class="arrow-row">
            <div class="arrow ${arrowActive(solarW)}">↓</div>
            <div class="arrow ${arrowActive(solarW)}">↓</div>
          </div>

          <!-- 🔋 Bat 1 + 🔋 Bat 2 nebeneinander -->
          <div class="bat-row">
            ${this._batCell('Batterie 1','battery1_soc','battery1_power','battery1_remaining','battery1_capacity')}
            ${this._batCell('Batterie 2','battery2_soc','battery2_power','battery2_remaining','battery2_capacity')}
          </div>

          <!-- ↓ -->
          <div class="arrow-row">
            <div class="arrow ${arrowActive(b1W)}">↓</div>
            <div class="arrow ${arrowActive(b2W)}">↓</div>
          </div>

          <!-- 🔋 Bat 3 -->
          <div class="node">
            <div class="bat-header">
              <span class="bat-icon">🔋</span>
              <span class="bat-label">Batterie 3</span>
              ${b3Soc !== null
                ? `<span class="bat-val" style="margin-left:auto;color:${this._socColor(b3Soc)}">${b3Soc.toFixed(1)} %</span>`
                : ''}
            </div>
            ${b3Soc !== null ? `
              <div class="soc-wrap">
                <div class="soc-fill" style="width:${Math.min(100,b3Soc)}%;background:${this._socColor(b3Soc)}"></div>
              </div>
            ` : ''}
            <div class="bat-vals">
              <div class="bat-val" style="color:${this._pwrColor(b3W)}">${this._pwrLabel(b3W)}</div>
              ${b3rem ? `<div class="bat-small">${b3rem}</div>` : ''}
            </div>
          </div>

          <!-- ↓ -->
          <div class="arrow-row">
            <div class="arrow ${arrowActive(b3W)}">↓</div>
            <div class="arrow ${arrowActive(b3W)}">↓</div>
          </div>

          <!-- ⚡ Hoymiles -->
          <div class="node single-node">
            <div class="node-icon-big">⚡</div>
            <div class="node-label">Hoymiles</div>
            <div class="node-vals">
              <div class="node-val" style="color:${hoymilesW > 0 ? '#ffab00' : 'inherit'}">
                ${this._fmt(hoymilesW, 'W')}
              </div>
            </div>
          </div>

          <!-- ↓ -->
          <div class="arrow-row">
            <div class="arrow ${arrowActive(hoymilesW)}">↓</div>
            <div class="arrow ${arrowActive(hoymilesW)}">↓</div>
          </div>

          <!-- 🏠 Shelly -->
          <div class="node single-node">
            <div class="node-icon-big">🏠</div>
            <div class="node-label">Shelly</div>
            <div class="node-vals">
              <div class="node-val" style="color:${this._pwrColor(shellyW ? -shellyW : null)}">
                ${this._fmt(shellyW, 'W')}
              </div>
            </div>
          </div>

        </div>

        <div class="updated">
          ${new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}
        </div>
      </ha-card>
    `;
  }
}

customElements.define('atlantis-energy-card', AtlantisEnergyCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'atlantis-energy-card',
  name:        'Atlantis Batterie Monitor',
  description: 'Energiefluss Solar → Batterie 1 + Batterie 2 → Batterie 3 → Hoymiles → Shelly',
  preview:     false,
  documentationURL: 'https://github.com/do1tl/atlantis-batterie-monitor',
});

console.info(
  '%c ATLANTIS-BATTERIE-MONITOR %c v1.3.0',
  'background:#1976d2;color:#fff;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px',
  'background:#333;color:#fff;padding:2px 6px;border-radius:0 3px 3px 0',
);
