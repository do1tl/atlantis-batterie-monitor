/**
 * Atlantis Energy Flow Card
 * Zeigt den Energiefluss: Solar → Batterie 1+2 → Batterie 3 → Shelly
 * mit SOC-Balken, Leistung und Restenergie.
 *
 * https://github.com/atlantisos/atlantis-energy-card
 */

// ── Konfigurationsfelder ──────────────────────────────────────────────────────

const FIELDS = [
  { key: 'title',               label: 'Kartentitel',                       type: 'text'   },
  { key: 'solar_power',         label: '☀️  Solar – Leistung (W)',           type: 'entity' },
  { key: 'battery12_soc',       label: '🔋  Batterie 1+2 – SOC (%)',         type: 'entity' },
  { key: 'battery12_power',     label: '🔋  Batterie 1+2 – Leistung (W)',    type: 'entity' },
  { key: 'battery12_remaining', label: '🔋  Batterie 1+2 – Restenergie',     type: 'entity' },
  { key: 'battery12_capacity',  label: '🔋  Batterie 1+2 – Kapazität (kWh)', type: 'number' },
  { key: 'battery3_soc',        label: '🔋  Batterie 3 – SOC (%)',           type: 'entity' },
  { key: 'battery3_power',      label: '🔋  Batterie 3 – Leistung (W)',      type: 'entity' },
  { key: 'battery3_remaining',  label: '🔋  Batterie 3 – Restenergie',       type: 'entity' },
  { key: 'battery3_capacity',   label: '🔋  Batterie 3 – Kapazität (kWh)',   type: 'number' },
  { key: 'shelly_power',        label: '🏠  Shelly – Leistung (W)',          type: 'entity' },
];

// ── Editor (Konfigurationsmenü) ───────────────────────────────────────────────

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
    this.style.display = 'block';
    this.style.padding = '4px 0';

    this.innerHTML = FIELDS.map(f => {
      if (f.type === 'entity') {
        return `
          <div style="margin-bottom:12px">
            <label style="display:block;font-size:11px;font-weight:600;
                          margin-bottom:4px;color:var(--secondary-text-color)">
              ${f.label}
            </label>
            <ha-entity-picker data-key="${f.key}" allow-custom-entity></ha-entity-picker>
          </div>`;
      }
      if (f.type === 'number') {
        return `
          <div style="margin-bottom:12px">
            <label style="display:block;font-size:11px;font-weight:600;
                          margin-bottom:4px;color:var(--secondary-text-color)">
              ${f.label}
            </label>
            <input type="number" data-key="${f.key}" step="0.1" min="0"
              style="width:100%;padding:6px 8px;border:1px solid var(--divider-color);
                     border-radius:6px;background:var(--card-background-color);
                     color:var(--primary-text-color);font-size:13px;box-sizing:border-box"
            />
          </div>`;
      }
      // text
      return `
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:11px;font-weight:600;
                        margin-bottom:4px;color:var(--secondary-text-color)">
            ${f.label}
          </label>
          <input type="text" data-key="${f.key}"
            style="width:100%;padding:6px 8px;border:1px solid var(--divider-color);
                   border-radius:6px;background:var(--card-background-color);
                   color:var(--primary-text-color);font-size:13px;box-sizing:border-box"
          />
        </div>`;
    }).join('');

    this._updateValues();
    this._attachListeners();
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
      const evName = f.type === 'entity' ? 'value-changed' : 'change';
      el.addEventListener(evName, e => {
        const val = f.type === 'entity' ? e.detail.value
                  : f.type === 'number' ? parseFloat(e.target.value) || 0
                  : e.target.value;
        this._config = { ...this._config, [f.key]: val };
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
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
      title:                'Energiefluss',
      solar_power:          '',
      battery12_soc:        '',
      battery12_power:      '',
      battery12_remaining:  '',
      battery12_capacity:   10,
      battery3_soc:         '',
      battery3_power:       '',
      battery3_remaining:   '',
      battery3_capacity:    5,
      shelly_power:         '',
    };
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  // ── Hilfsfunktionen ────────────────────────────────────────────────────────

  _state(key) {
    if (!this._hass || !this._config || !this._config[key]) return null;
    const s = this._hass.states[this._config[key]];
    return s || null;
  }

  _val(key) {
    const s = this._state(key);
    return s ? parseFloat(s.state) : null;
  }

  _unit(key) {
    const s = this._state(key);
    return s ? (s.attributes.unit_of_measurement || '') : '';
  }

  _fmt(val, unit) {
    if (val === null || isNaN(val)) return '–';
    const u = (unit || '').trim();
    if (u === 'kWh') return val.toFixed(2) + ' kWh';
    if (u === 'Wh')  return Math.abs(val) >= 1000
                          ? (val / 1000).toFixed(2) + ' kWh'
                          : val.toFixed(0) + ' Wh';
    if (u === 'W')   return Math.abs(val) >= 1000
                          ? (val / 1000).toFixed(1) + ' kW'
                          : val.toFixed(0) + ' W';
    if (u === '%')   return val.toFixed(1) + ' %';
    return val.toFixed(1) + (u ? ' ' + u : '');
  }

  _socColor(soc) {
    if (soc === null) return '#555';
    if (soc >= 75)   return '#00c853';
    if (soc >= 50)   return '#aeea00';
    if (soc >= 25)   return '#ffab00';
    return '#ff3d00';
  }

  _pwrColor(w) {
    if (w === null) return 'var(--secondary-text-color)';
    if (w > 10)  return '#00c853';
    if (w < -10) return '#ff6d00';
    return 'var(--secondary-text-color)';
  }

  _pwrLabel(w, unit) {
    if (w === null) return '–';
    const sign = w > 10 ? '▲ ' : w < -10 ? '▼ ' : '';
    return sign + this._fmt(Math.abs(w), unit || 'W');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _render() {
    if (!this._config) return;

    const title    = this._config.title || 'Energiefluss';
    const solarW   = this._val('solar_power');
    const b12Soc   = this._val('battery12_soc');
    const b12W     = this._val('battery12_power');
    const b12Rem   = this._val('battery12_remaining');
    const b12Cap   = this._config.battery12_capacity || null;
    const b3Soc    = this._val('battery3_soc');
    const b3W      = this._val('battery3_power');
    const b3Rem    = this._val('battery3_remaining');
    const b3Cap    = this._config.battery3_capacity  || null;
    const shellyW  = this._val('shelly_power');

    const uB12Rem  = this._unit('battery12_remaining');
    const uB3Rem   = this._unit('battery3_remaining');

    // Remaining energy as % of capacity (if Wh and capacity given)
    const b12RemPct = (b12Rem !== null && b12Cap)
      ? ((uB12Rem === 'Wh' ? b12Rem / 1000 : b12Rem) / b12Cap * 100).toFixed(0) + '%'
      : null;
    const b3RemPct  = (b3Rem !== null && b3Cap)
      ? ((uB3Rem === 'Wh' ? b3Rem / 1000 : b3Rem) / b3Cap * 100).toFixed(0) + '%'
      : null;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        ha-card {
          padding: 14px 16px 16px;
          overflow: hidden;
        }

        .card-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--secondary-text-color);
          margin-bottom: 14px;
        }

        .flow {
          display: flex;
          align-items: stretch;
          gap: 6px;
        }

        /* ── Node ── */
        .node {
          flex: 1;
          min-width: 0;
          background: var(--ha-card-background, var(--card-background-color));
          border: 1px solid var(--divider-color, rgba(255,255,255,0.12));
          border-radius: 12px;
          padding: 10px 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }

        .node-icon  { font-size: 24px; line-height: 1; }
        .node-name  {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
        }
        .node-val   { font-size: 14px; font-weight: 600; line-height: 1.4; }
        .node-small { font-size: 11px; color: var(--secondary-text-color); line-height: 1.4; }

        /* ── SOC bar ── */
        .soc-wrap {
          width: 100%;
          background: rgba(128,128,128,0.2);
          border-radius: 3px;
          height: 5px;
          overflow: hidden;
          margin: 2px 0;
        }
        .soc-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s ease;
        }

        /* ── Arrow connector ── */
        .arrow-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 22px;
        }
        .arrow {
          font-size: 18px;
          color: var(--secondary-text-color);
          opacity: 0.5;
          animation: pulse 1.8s ease-in-out infinite;
        }
        .arrow.active {
          color: #00c853;
          opacity: 1;
        }
        .arrow.discharge {
          color: #ff6d00;
          opacity: 0.8;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.9; }
        }

        /* ── Updated stamp ── */
        .updated {
          text-align: right;
          font-size: 10px;
          color: var(--secondary-text-color);
          opacity: 0.5;
          margin-top: 10px;
        }
      </style>

      <ha-card>
        <div class="card-title">${title}</div>

        <div class="flow">

          <!-- Solar -->
          <div class="node">
            <div class="node-icon">☀️</div>
            <div class="node-name">Solar</div>
            <div class="node-val" style="color:${solarW > 0 ? '#ffab00' : 'inherit'}">
              ${this._fmt(solarW, 'W')}
            </div>
          </div>

          <!-- Arrow Solar → Bat 1+2 -->
          <div class="arrow-wrap">
            <div class="arrow ${solarW > 10 ? 'active' : ''}">›</div>
          </div>

          <!-- Batterie 1+2 -->
          <div class="node">
            <div class="node-icon">🔋</div>
            <div class="node-name">Bat 1+2</div>
            ${b12Soc !== null ? `
              <div class="soc-wrap">
                <div class="soc-fill"
                     style="width:${Math.min(100,b12Soc)}%;background:${this._socColor(b12Soc)}">
                </div>
              </div>
              <div class="node-val" style="color:${this._socColor(b12Soc)}">
                ${b12Soc.toFixed(1)} %
              </div>
            ` : '<div class="node-val">–</div>'}
            <div class="node-val" style="color:${this._pwrColor(b12W)}">
              ${this._pwrLabel(b12W)}
            </div>
            ${b12Rem !== null ? `
              <div class="node-small">
                ${this._fmt(b12Rem, uB12Rem)}
                ${b12RemPct ? `<span style="opacity:.6">&nbsp;(${b12RemPct})</span>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Arrow Bat 1+2 → Bat 3 -->
          <div class="arrow-wrap">
            <div class="arrow ${b12W < -10 ? 'discharge' : b12W > 10 ? 'active' : ''}">›</div>
          </div>

          <!-- Batterie 3 -->
          <div class="node">
            <div class="node-icon">🔋</div>
            <div class="node-name">Bat 3</div>
            ${b3Soc !== null ? `
              <div class="soc-wrap">
                <div class="soc-fill"
                     style="width:${Math.min(100,b3Soc)}%;background:${this._socColor(b3Soc)}">
                </div>
              </div>
              <div class="node-val" style="color:${this._socColor(b3Soc)}">
                ${b3Soc.toFixed(1)} %
              </div>
            ` : '<div class="node-val">–</div>'}
            <div class="node-val" style="color:${this._pwrColor(b3W)}">
              ${this._pwrLabel(b3W)}
            </div>
            ${b3Rem !== null ? `
              <div class="node-small">
                ${this._fmt(b3Rem, uB3Rem)}
                ${b3RemPct ? `<span style="opacity:.6">&nbsp;(${b3RemPct})</span>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Arrow Bat 3 → Shelly -->
          <div class="arrow-wrap">
            <div class="arrow ${b3W < -10 ? 'discharge' : b3W > 10 ? 'active' : ''}">›</div>
          </div>

          <!-- Shelly -->
          <div class="node">
            <div class="node-icon">🏠</div>
            <div class="node-name">Shelly</div>
            <div class="node-val" style="color:${this._pwrColor(shellyW ? -shellyW : null)}">
              ${this._fmt(shellyW, 'W')}
            </div>
          </div>

        </div>

        <div class="updated">
          ${new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}
        </div>
      </ha-card>
    `;
  }
}

customElements.define('atlantis-energy-card', AtlantisEnergyCard);

// HACS / Lovelace Karten-Registrierung
window.customCards = window.customCards || [];
window.customCards.push({
  type:        'atlantis-energy-card',
  name:        'Atlantis Energy Flow',
  description: 'Energiefluss Solar → Batterie 1+2 → Batterie 3 → Shelly mit SOC, Watt und Restenergie',
  preview:     false,
  documentationURL: 'https://github.com/atlantisos/atlantis-energy-card',
});

console.info(
  '%c ATLANTIS-ENERGY-CARD %c geladen ',
  'background:#1976d2;color:#fff;font-weight:700;padding:2px 6px;border-radius:3px 0 0 3px',
  'background:#333;color:#fff;padding:2px 6px;border-radius:0 3px 3px 0'
);
