import { appStyles, el, icon, button, textField, dropdown, panelHeader, notice } from "@ha-plus/ui";

/* HA+ Modes uses HA components and theme tokens, with no runtime dependencies. */
const DOMAIN = "modes_plus";
// Supplied ha-plus-modes-mono.svg, with transforms and strokes flattened for HA icons.
const LOGO_PATH = "M486.311003,109.999628L486.311003,401.999167C486.311003,448.360304 448.671798,485.999328 402.310872,485.999328L110.310822,485.999328C63.949897,485.999328 26.310691,448.360304 26.310691,401.999167L26.310691,385.540691L257.810744,385.540691C329.306921,385.540691 387.352601,327.495493 387.352601,255.999398C387.352601,184.503302 329.306921,126.458104 257.810744,126.458104L26.310691,126.458104L26.310691,109.999628C26.310691,63.638491 63.949897,25.999467 110.310822,25.999467L402.310872,25.999467C448.671798,25.999467 486.311003,63.638491 486.311003,109.999628ZM360.269124,255.999398C360.269124,312.547517 314.359153,358.457719 257.810744,358.457719L26.310691,358.457719L26.310691,153.541076L257.810744,153.541076C314.359153,153.541076 360.269124,199.451278 360.269124,255.999398ZM164.561139,255.999398C164.561139,306.637712 205.672754,347.749342 256.310847,347.749342C306.948940,347.749342 348.060555,306.637712 348.060555,255.999398C348.060555,205.361083 306.948940,164.249453 256.310847,164.249453C205.672754,164.249453 164.561139,205.361083 164.561139,255.999398ZM270.409264,185.999715C270.409264,205.506160 273.438428,214.011755 286.672051,227.245167C293.807392,234.380545 299.716417,238.371353 305.659787,240.487868C310.869839,242.343239 316.692103,243.038403 326.311007,243.038403C345.108664,243.038403 345.108664,268.960973 326.311007,268.960973C316.670671,268.960973 310.856091,269.653718 305.654329,271.506293C299.720746,273.619503 293.817117,277.609258 286.671829,284.754431C273.452860,297.972850 270.409264,306.519798 270.409264,325.999661C270.409264,343.281375 242.212779,343.281375 242.212779,325.999661C242.212779,306.493216 239.183615,297.987621 225.949991,284.754209C218.814650,277.618831 212.905626,273.628024 206.962255,271.511508C201.752204,269.656137 195.929940,268.960973 186.311036,268.960973C167.513379,268.960973 167.513379,243.038403 186.311036,243.038403C195.951372,243.038403 201.765952,242.345658 206.967713,240.493083C212.901296,238.379873 218.804926,234.390118 225.950214,227.244945C239.169183,214.026526 242.212779,205.479578 242.212779,185.999715C242.212779,168.718001 270.409264,168.718001 270.409264,185.999715Z";
window.customIcons = window.customIcons || {};
window.customIcons["modes-plus"] = {
  getIcon: async (name) => name === "logo" ? { path: LOGO_PATH, viewBox: "0 0 513 512" } : undefined,
};

const DURATIONS = [[0, "Until cleared"], [30, "30 minutes"], [60, "1 hour"], [120, "2 hours"], [480, "8 hours"]];
function when(value) { return new Date(value).toLocaleString(); }

class ModesView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._busy = false;
    this._generation = 0;
    this._selection = { group: "", mode: "", duration: 0 };
    this._outside = event => {
      for (const field of this.shadowRoot.querySelectorAll(".field")) {
        if (!event.composedPath().includes(field)) {
          const menu = field.querySelector(".listbox");
          if (menu) menu.hidden = true;
          field.querySelector(".combobox")?.setAttribute("aria-expanded", "false");
        }
      }
    };
  }
  set narrow(value) { this._narrow = value; if (this._data) this._render(); }
  get narrow() { return this._narrow; }
  set hass(value) {
    const previous = this._hass;
    this._hass = value;
    if (!this.isConnected) return;
    const changed = !previous || Object.keys(value.states).some(key => value.states[key].attributes.mode_id && value.states[key] !== previous.states[key]) || Object.keys(previous.states).some(key => previous.states[key].attributes.mode_id && !value.states[key]);
    if (changed || !this._data) this._refresh();
  }
  connectedCallback() {
    this.ownerDocument.addEventListener("pointerdown", this._outside, true);
    if (this._hass) this._refresh();
  }
  disconnectedCallback() {
    this._generation++;
    this.ownerDocument.removeEventListener("pointerdown", this._outside, true);
  }
  async _refresh() {
    if (this._loading) { this._again = true; return; }
    this._loading = true;
    const generation = this._generation;
    if (!this._data) this._render();
    try {
      const data = await this._hass.callWS({ type: "modes_plus/snapshot" });
      if (generation === this._generation) { this._data = data; this._error = ""; }
    } catch (error) { this._error = error.message || "Unable to load modes."; }
    finally {
      this._loading = false;
      if (this.isConnected) this._render();
      if (this._again && this.isConnected) { this._again = false; this._refresh(); }
    }
  }
  async _perform(request) {
    this._busy = true;
    this._error = "";
    this._render();
    try { await request(); }
    catch (error) { this._error = error.message || "The action failed. Try again."; }
    finally {
      this._busy = false;
      const error = this._error;
      await this._refresh();
      if (error) { this._error = error; this._render(); }
    }
  }
  _action(service, data) { return this._perform(() => this._hass.callService(DOMAIN, service, data)); }
  _groups(modes) {
    const groups = new Map((this._data.groups || []).map(name => [`group:${name}`, { key: `group:${name}`, name, group: name, members: [] }]));
    for (const mode of modes) {
      const key = mode.group ? `group:${mode.group}` : `mode:${mode.id}`;
      if (!groups.has(key)) groups.set(key, { key, name: mode.group || mode.name, group: mode.group || "", members: [] });
      groups.get(key).members.push(mode);
    }
    // Include the whole exclusive group so its active setting is never hidden.
    return [...groups.values()].filter(group => !this._config?.modes?.length || group.members.some(mode => this._config.modes.includes(mode.id))).sort((a, b) => a.name.localeCompare(b.name));
  }
  _choose(key, value) {
    this._selection[key] = value;
    if (key === "group") {
      this._selection.duration = 0;
      const group = this._currentGroups.find(item => item.key === value);
      this._selection.mode = group?.members.find(mode => mode.active)?.id || "";
    }
    this._render();
    this.shadowRoot.querySelector(`[data-control="${key}"]`)?.focus();
  }
  _apply(group) {
    return this._action("select", {
      group: group.group,
      mode_id: this._selection.mode,
      duration: Number(this._selection.duration),
      ...(!group.group ? { standalone_mode_id: group.members[0].id } : {}),
    });
  }
  _controls(groups) {
    if (!groups.length) return el("p", "Create a mode in Devices & services to get started.", "ha-plus-muted");
    let group = groups.find(item => item.key === this._selection.group);
    if (!group) {
      group = groups[0];
      this._selection.group = group.key;
      this._selection.mode = group.members.find(mode => mode.active)?.id || "";
    }
    if (!group.members.some(mode => mode.id === this._selection.mode)) this._selection.mode = "";
    const form = el("div", undefined, "controls ha-plus-form-grid");
    form.append(
      dropdown("group", "Group", groups.map(item => ({ value: item.key, label: item.name })), group.key, value => this._choose("group", value), this._busy),
      dropdown("mode", "Mode", [{ value: "", label: "None · normal behavior" }, ...group.members.map(mode => ({ value: mode.id, label: mode.name }))], this._selection.mode, value => this._choose("mode", value), this._busy || !group.members.length),
      dropdown("duration", "Duration", DURATIONS.map(([value, label]) => ({ value, label })), this._selection.duration, value => this._choose("duration", value), this._busy || !this._selection.mode),
      button("Apply", () => this._apply(group), this._busy || !group.members.length, "primary"),
    );
    return form;
  }
  _modeDetails(mode) {
    const detail = el("details");
    detail.append(el("summary", `${mode.name} · priority ${mode.priority}`));
    for (const [key, effect] of Object.entries(mode.effects)) {
      const owner = this._data.modes.find(item => item.id === this._data.effects[key]?.mode_id);
      const name = this._hass.states[key]?.attributes.friendly_name || key;
      detail.append(el("p", `${name}: ${effect.state}${effect.brightness ? ` · brightness ${Math.round(effect.brightness / 255 * 100)}%` : ""}${mode.active && owner && owner.id !== mode.id ? ` · overridden by ${owner.name}` : ""}`));
    }
    for (const [key, value] of Object.entries(mode.values)) detail.append(el("p", `${key}: ${value}`));
    if (!Object.keys(mode.effects).length && !Object.keys(mode.values).length) detail.append(el("p", "No managed settings. Use this mode as an automation condition.", "ha-plus-muted"));
    return detail;
  }
  _groupCard(group) {
    const active = group.members.find(mode => mode.active);
    const card = el("ha-card", undefined, `group ha-plus-group ha-plus-padded-card${active ? " active" : ""}`);
    const row = el("div", undefined, "ha-plus-row");
    row.append(icon(active?.icon || "mdi:layers-outline"), el("h3", group.name));
    card.append(row, el("p", active?.name || "Normal behavior", "group-state ha-plus-value"));
    if (active) {
      card.append(el("p", `Started ${when(active.active.since)} · ${active.active.source}`, "ha-plus-muted"));
      if (active.active.until) card.append(el("p", `Ends ${when(active.active.until)}`, "ha-plus-muted"));
      const owned = [...Object.values(this._data.effects), ...Object.values(this._data.values)].filter(item => item.mode_id === active.id).length;
      const total = Object.keys(active.effects).length + Object.keys(active.values).length;
      card.append(el("p", `${owned} effective · ${total - owned} overridden`, "ha-plus-muted"));
    }
    const chips = el("div", undefined, "ha-plus-chips");
    for (const mode of group.members) {
      const chip = el("span", undefined, `chip ha-plus-chip${mode.active ? " active" : ""}`);
      chip.append(icon(mode.icon || "mdi:home-switch"), el("span", mode.name));
      chip.setAttribute("aria-label", `${mode.name}: ${mode.active ? "active" : "inactive"}`);
      chips.append(chip);
    }
    card.append(chips);
    if (!group.members.length) card.append(el("p", "No modes yet. Choose this group when adding a mode in Devices & services.", "ha-plus-muted"));
    for (const mode of group.members) card.append(this._modeDetails(mode));
    return card;
  }
  _newGroup() {
    const detail = el("details", undefined, "create-group ha-plus-create");
    detail.append(el("summary", "Create group"));
    const form = el("form");
    const { field, input } = textField("Group name", {
      name: "group_name", required: true, maxLength: 80, disabled: this._busy,
    });
    const submit = el("button", "Create group");
    submit.type = "submit";
    submit.disabled = this._busy;
    form.append(field, submit);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      this._perform(async () => {
        const result = await this._hass.callWS({ type: "modes_plus/create_group", name });
        this._selection.group = `group:${result.name}`;
        this._selection.mode = "";
        this._selection.duration = 0;
      });
    });
    detail.append(form);
    return detail;
  }
  _render() {
    const focused = this.shadowRoot.activeElement?.dataset.control;
    this.shadowRoot.replaceChildren(el("style", appStyles));
    const compact = this.localName === "modes-plus-card";
    const root = el(compact ? "ha-card" : "div", undefined, compact ? "ha-plus-compact" : "");
    if (!compact) {
      const refresh = button(undefined, () => this._refresh(), this._loading, "icon-button");
      refresh.setAttribute("aria-label", "Refresh modes");
      refresh.title = "Refresh modes";
      refresh.append(icon("mdi:refresh"));
      root.append(panelHeader("HA+ Modes", { hass:this._hass, narrow:this.narrow, actions:[refresh] }));
    }
    const main = el("main", undefined, compact ? "ha-plus-compact-content" : "ha-plus-content");
    root.append(main);
    if (compact) main.append(el("h2", this._config?.title || "Home modes"));
    if (this._error) {
      const error = notice(this._error, "error");
      error.append(button("Retry", () => this._refresh()));
      main.append(error);
    }
    if (!this._data) {
      if (!this._error) main.append(notice("Loading modes…", "loading"));
      this.shadowRoot.append(root);
      return;
    }
    let modes = [...this._data.modes].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
    const groups = this._groups(modes);
    this._currentGroups = groups;
    const controls = compact ? el("section") : el("ha-card", undefined, "ha-plus-padded-card");
    if (!compact) controls.append(el("h2", "Choose a household setting"));
    controls.append(this._controls(groups));
    if (!compact) {
      controls.append(el("p", "Each group has one selected mode. Different groups can stay active together; higher priorities override conflicting settings. Choose None to clear a group.", "ha-plus-muted"));
      if (this._hass.user?.is_admin) controls.append(this._newGroup());
    }
    main.append(controls);
    if (!compact) main.append(el("h2", "Your groups"));
    const grid = el("section", undefined, "grid ha-plus-card-grid");
    for (const group of groups) grid.append(this._groupCard(group));
    main.append(grid);
    const errors = Object.entries(this._data.errors);
    if (errors.length) {
      const box = el("div", undefined, "notice error");
      box.setAttribute("role", "alert");
      box.append(el("p", "Some device actions need attention."));
      if (!compact) for (const [key, error] of errors) box.append(el("p", `${key}: ${error}`));
      const link = el("a", "View details");
      link.href = "/ha-plus-modes";
      box.append(link, button("Retry device actions", () => this._action("retry", {}), this._busy));
      main.append(box);
    }
    if (!compact) {
      const explain = el("ha-card", undefined, "ha-plus-padded-card");
      explain.append(el("h2", "Effective settings"));
      for (const [key, item] of Object.entries(this._data.effects)) {
        const owner = this._data.modes.find(mode => mode.id === item.mode_id);
        explain.append(el("div", `${this._hass.states[key]?.attributes.friendly_name || key} → ${item.desired.state}${item.desired.brightness ? ` · ${Math.round(item.desired.brightness / 255 * 100)}%` : ""} · ${owner?.group ? owner.group + " / " : ""}${owner?.name || item.mode_id}`, "ha-plus-detail-row"));
      }
      for (const [key, item] of Object.entries(this._data.values)) {
        const owner = this._data.modes.find(mode => mode.id === item.mode_id);
        explain.append(el("div", `${key} → ${item.value} · ${owner?.group ? owner.group + " / " : ""}${owner?.name}`, "ha-plus-detail-row"));
      }
      if (!Object.keys(this._data.effects).length && !Object.keys(this._data.values).length) explain.append(el("p", "No settings are currently controlled by modes.", "ha-plus-muted"));
      main.append(explain);
      const history = el("details");
      history.append(el("summary", "Recent changes"));
      for (const item of this._data.history) history.append(el("p", `${item.mode} ${item.active ? "selected" : "cleared"} · ${when(item.at)}`, "ha-plus-muted"));
      main.append(history);
      if (this._hass.user?.is_admin) {
        const link = el("a", "Add or configure modes in Devices & services");
        link.href = "/config/integrations/integration/modes_plus";
        main.append(link);
      }
    }
    this.shadowRoot.append(root);
    if (focused) this.shadowRoot.querySelector(`[data-control="${focused}"]`)?.focus();
  }
}
class ModesPlusPanel extends ModesView {}
class ModesPlusCard extends ModesView {
  setConfig(config) {
    if (config.modes !== undefined && (!Array.isArray(config.modes) || config.modes.some(value => typeof value !== "string"))) throw new Error("modes must be a list of mode IDs");
    this._config = config;
    if (this._hass) this._render();
  }
  getCardSize() { return 5; }
  static getStubConfig() { return { title: "Home modes" }; }
}
if (!customElements.get("modes-plus-panel")) customElements.define("modes-plus-panel", ModesPlusPanel);
if (!customElements.get("modes-plus-card")) customElements.define("modes-plus-card", ModesPlusCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === "modes-plus-card")) window.customCards.push({ type: "modes-plus-card", name: "HA+ Modes", description: "Groups, household settings, and temporary overrides", preview: true });
