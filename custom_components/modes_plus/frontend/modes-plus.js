/* HA Plus Modes: native HA components and theme tokens, no external runtime. */
const DOMAIN = "modes_plus";
const style = `
:host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif)}
*{box-sizing:border-box}header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--app-header-background-color);color:var(--app-header-text-color);min-height:64px}header h1{font-size:20px;font-weight:400;flex:1;margin:0}main{max-width:1000px;margin:auto;padding:24px}h2{font-size:18px;font-weight:500;margin:0 0 16px}h3{font-size:16px;margin:0}p{line-height:1.5}.muted{color:var(--secondary-text-color);font-size:14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px;margin-bottom:24px}ha-card{display:block;padding:20px;border-radius:var(--ha-card-border-radius,12px);background:var(--ha-card-background,var(--card-background-color));box-shadow:var(--ha-card-box-shadow,none);border:var(--ha-card-border-width,1px) solid var(--ha-card-border-color,var(--divider-color))}.row{display:flex;align-items:center;gap:12px}.row h3{flex:1}.active ha-icon{color:var(--primary-color)}.badge{font-size:12px;color:var(--primary-color);font-weight:500}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}button,a{font:inherit}button{min-height:40px;padding:8px 12px;border:0;border-radius:var(--ha-border-radius-sm,8px);background:transparent;color:var(--primary-color);cursor:pointer;font-weight:500}button:hover{background:var(--secondary-background-color)}button:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}button:disabled{opacity:.5;cursor:default}select{font:inherit;min-height:40px;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px;padding:8px;max-width:100%}a{color:var(--primary-color)}details{margin-top:16px}summary{cursor:pointer;padding:8px 0}.effect{padding:12px 0;border-bottom:1px solid var(--divider-color);overflow-wrap:anywhere}.effect:last-child{border:0}.error{color:var(--error-color);white-space:pre-wrap}.notice{padding:12px 16px;margin-bottom:16px;background:var(--secondary-background-color);border-radius:8px}section{margin-bottom:24px}ha-icon{flex-shrink:0}.compact{padding:0}.compact .grid{display:block;margin:0}.compact ha-card{padding:16px;margin:0;border:0;box-shadow:none}.compact .mode{border-top:1px solid var(--divider-color);border-radius:0}.compact h2{padding:16px 16px 0;margin:0}.compact .notice{margin:16px}@media(max-width:600px){main{padding:16px}header h1{font-size:18px}}`;
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, handler, disabled = false) {
  const node = el("button", text); node.type = "button";
  node.disabled = disabled; node.addEventListener("click", handler); return node;
}
function icon(name) { const node = el("ha-icon"); node.setAttribute("icon", name); return node; }
function when(value) { return new Date(value).toLocaleString(); }

class ModesView extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:"open"}); this._busy = false; this._generation = 0; }
  set narrow(value) { this._narrow = value; if (this._hass && this._data) this._render(); }
  get narrow() { return this._narrow; }
  set hass(value) {
    const previous = this._hass; this._hass = value;
    if (!this.isConnected) return;
    const changed = !previous || Object.keys(value.states).some(key => {
      const state = value.states[key];
      return state.attributes.mode_id && state !== previous.states[key];
    }) || Object.keys(previous.states).some(key => previous.states[key].attributes.mode_id && !value.states[key]);
    if (changed || !this._data) this._refresh();
  }
  connectedCallback() { if (this._hass) this._refresh(); }
  disconnectedCallback() { this._generation++; }
  async _refresh() {
    if (this._loading) { this._again = true; return; }
    this._loading = true; const generation = this._generation;
    if (!this._data) this._render();
    try {
      const data = await this._hass.callWS({type:"modes_plus/snapshot"});
      if (generation === this._generation) { this._data = data; this._error = ""; }
    } catch (err) { this._error = err.message || "Unable to load modes."; }
    finally {
      this._loading = false;
      if (this.isConnected) this._render();
      if (this._again && this.isConnected) { this._again = false; this._refresh(); }
    }
  }
  async _action(service, data) {
    this._busy = true; this._error = ""; this._render();
    try { await this._hass.callService(DOMAIN, service, data); }
    catch (err) { this._error = err.message || "The action failed. Try again."; }
    finally {
      this._busy = false;
      // Keep action failures visible while refreshing the current state.
      const error = this._error;
      await this._refresh();
      if (error) { this._error = error; this._render(); }
    }
  }
  _mode(mode) {
    const card = el("ha-card", undefined, "mode" + (mode.active ? " active" : ""));
    const row = el("div", undefined, "row"); row.append(icon(mode.icon || "mdi:home-switch"), el("h3", mode.name), el("span", mode.active ? "Active" : "Inactive", "badge")); card.append(row);
    const owned = Object.values(this._data.effects).filter(item => item.mode_id === mode.id).length + Object.values(this._data.values).filter(item => item.mode_id === mode.id).length;
    const total = Object.keys(mode.effects).length + Object.keys(mode.values).length;
    card.append(el("p", `Priority ${mode.priority}${mode.group ? " · " + mode.group : ""}`, "muted"));
    if (mode.active) {
      card.append(el("p", `Started ${when(mode.active.since)} · ${mode.active.source}`, "muted"));
      if (mode.active.until) card.append(el("p", `Ends ${when(mode.active.until)}`, "muted"));
      card.append(el("p", `${owned} effective · ${total - owned} overridden`, "muted"));
    }
    const actions = el("div", undefined, "actions");
    const duration = el("select"); duration.setAttribute("aria-label", `Duration for ${mode.name}`);
    for (const [value, label] of [[0,"Until turned off"],[30,"30 minutes"],[60,"1 hour"],[120,"2 hours"],[480,"8 hours"]]) {
      const option = el("option", label); option.value = value; duration.append(option);
    }
    duration.disabled = this._busy;
    if (!mode.active) actions.append(duration);
    actions.append(button(mode.active ? "End mode" : "Activate", () => this._action(mode.active ? "deactivate" : "activate", {mode_id:mode.id, ...(!mode.active ? {duration:Number(duration.value)} : {})}), this._busy));
    card.append(actions);
    const detail = el("details"); detail.append(el("summary", "Settings and return behavior"));
    for (const [key, effect] of Object.entries(mode.effects)) {
      const winner = this._data.effects[key];
      const owner = this._data.modes.find(item => item.id === winner?.mode_id);
      const friendly = this._hass.states[key]?.attributes.friendly_name || key;
      detail.append(el("p", `${friendly}: ${effect.state}${effect.brightness ? ` · brightness ${Math.round(effect.brightness / 255 * 100)}%` : ""}${mode.active && owner && owner.id !== mode.id ? ` · overridden by ${owner.name}` : ""}`));
    }
    for (const [key, value] of Object.entries(mode.values)) detail.append(el("p", `${key}: ${value}`));
    if (!total) detail.append(el("p", "No managed settings. Use this mode as an automation condition."));
    detail.append(el("p", "Ending this mode applies the remaining modes. With no remaining owner, the previous device state is restored only if no later device update changed its command context. Manual changes are respected while the winning effect stays the same.", "muted"));
    card.append(detail); return card;
  }
  _render() {
    this.shadowRoot.replaceChildren(el("style", style));
    const compact = this.localName === "modes-plus-card";
    const root = el(compact ? "ha-card" : "div");
    if (!compact) {
      const header = el("header");
      const menu = el("ha-menu-button"); menu.hass = this._hass; menu.narrow = this.narrow;
      header.append(menu, el("h1", "HA Plus Modes"), button("Refresh", () => this._refresh(), this._loading)); root.append(header);
    }
    const main = el("main", undefined, compact ? "compact" : ""); root.append(main);
    if (compact) main.append(el("h2", this._config?.title || "Home modes"));
    if (this._error) { const notice = el("div", this._error, "notice error"); notice.setAttribute("role", "alert"); notice.append(button("Retry", () => this._refresh())); main.append(notice); }
    if (!this._data) { main.append(el("p", this._error ? "" : "Loading modes…", "notice")); this.shadowRoot.append(root); return; }
    let modes = [...this._data.modes].sort((a,b) => b.priority - a.priority || a.name.localeCompare(b.name));
    if (compact && this._config?.modes?.length) modes = modes.filter(mode => this._config.modes.includes(mode.id));
    for (const active of [true, false]) {
      const list = modes.filter(mode => !!mode.active === active);
      if (!compact) main.append(el("h2", active ? "Your home now" : "Other modes"));
      const grid = el("div", undefined, "grid");
      for (const mode of list) grid.append(this._mode(mode));
      if (!list.length && !compact) grid.append(el("p", active ? "No modes active. Your normal household settings apply." : "All configured modes are active.", "muted"));
      main.append(grid);
    }
    if (compact && !modes.length) main.append(el("p", "No modes match this card. Check its configured mode IDs.", "notice"));
    if (compact && Object.keys(this._data.errors).length) {
      const notice = el("div", "Some device actions need attention. ", "notice error");
      notice.setAttribute("role", "alert");
      const link = el("a", "View details"); link.href = "/ha-plus-modes";
      notice.append(link, button("Retry device actions", () => this._action("retry", {}), this._busy));
      main.append(notice);
    }
    if (!compact) {
      const explain = el("ha-card"); explain.append(el("h2", "Effective settings"));
      for (const [key,item] of Object.entries(this._data.effects)) {
        const owner = modes.find(mode => mode.id === item.mode_id);
        explain.append(el("div", `${this._hass.states[key]?.attributes.friendly_name || key} → ${item.desired.state}${item.desired.brightness ? ` · ${Math.round(item.desired.brightness/255*100)}%` : ""} · ${owner?.name || item.mode_id}`, "effect"));
      }
      for (const [key,item] of Object.entries(this._data.values)) explain.append(el("div", `${key} → ${item.value} · ${modes.find(mode => mode.id === item.mode_id)?.name}`, "effect"));
      if (!Object.keys(this._data.effects).length && !Object.keys(this._data.values).length) explain.append(el("p", "No settings are currently controlled by modes.", "muted"));
      const section = el("section"); section.append(explain); main.append(section);
      const errors = Object.entries(this._data.errors);
      if (errors.length) { const box = el("ha-card"); box.append(el("h2", "Some device actions need attention")); for (const [key,error] of errors) box.append(el("p", `${key}: ${error}`, "error")); box.append(button("Retry device actions", () => this._action("retry", {}), this._busy)); main.append(box); }
      const history = el("details"); history.append(el("summary", "Recent changes"));
      for (const item of this._data.history) history.append(el("p", `${item.mode} ${item.active ? "activated" : "ended"} · ${when(item.at)}`, "muted")); main.append(history);
      if (this._hass.user?.is_admin) { const link = el("a", "Add or configure modes in Devices & services"); link.href = "/config/integrations/integration/modes_plus"; main.append(link); }
    }
    this.shadowRoot.append(root);
  }
}
class ModesPlusPanel extends ModesView {}
class ModesPlusCard extends ModesView {
  setConfig(config) { if (config.modes !== undefined && (!Array.isArray(config.modes) || config.modes.some(value => typeof value !== "string"))) throw new Error("modes must be a list of mode IDs"); this._config = config; if (this._hass) this._render(); }
  getCardSize() { return 4; }
  static getStubConfig() { return {title:"Home modes"}; }
}
if (!customElements.get("modes-plus-panel")) customElements.define("modes-plus-panel", ModesPlusPanel);
if (!customElements.get("modes-plus-card")) customElements.define("modes-plus-card", ModesPlusCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === "modes-plus-card")) window.customCards.push({type:"modes-plus-card",name:"HA Plus Modes",description:"Household modes, priorities, and temporary overrides",preview:true});
