import messages from "./translations/en.json";
import { localize, haContext } from "@ha-plus/ui";
const t = (key, values) => localize(haContext(), messages, key, values);

import { appStyles, el, icon, button, textField, dropdown, panelHeader, notice, integrationUrl, applyPreferences, formatDateTime, showMoreInfo, showToast, loadNativeComponents, navigate, focusControl } from "@ha-plus/ui";

/* HA+ Modes uses HA components and theme tokens, with no runtime dependencies. */
const DOMAIN = "modes_plus";
// Supplied ha-plus-modes-mono.svg, with transforms and strokes flattened for HA icons.
const LOGO_PATH = "M486.311003,109.999628L486.311003,401.999167C486.311003,448.360304 448.671798,485.999328 402.310872,485.999328L110.310822,485.999328C63.949897,485.999328 26.310691,448.360304 26.310691,401.999167L26.310691,385.540691L257.810744,385.540691C329.306921,385.540691 387.352601,327.495493 387.352601,255.999398C387.352601,184.503302 329.306921,126.458104 257.810744,126.458104L26.310691,126.458104L26.310691,109.999628C26.310691,63.638491 63.949897,25.999467 110.310822,25.999467L402.310872,25.999467C448.671798,25.999467 486.311003,63.638491 486.311003,109.999628ZM360.269124,255.999398C360.269124,312.547517 314.359153,358.457719 257.810744,358.457719L26.310691,358.457719L26.310691,153.541076L257.810744,153.541076C314.359153,153.541076 360.269124,199.451278 360.269124,255.999398ZM164.561139,255.999398C164.561139,306.637712 205.672754,347.749342 256.310847,347.749342C306.948940,347.749342 348.060555,306.637712 348.060555,255.999398C348.060555,205.361083 306.948940,164.249453 256.310847,164.249453C205.672754,164.249453 164.561139,205.361083 164.561139,255.999398ZM270.409264,185.999715C270.409264,205.506160 273.438428,214.011755 286.672051,227.245167C293.807392,234.380545 299.716417,238.371353 305.659787,240.487868C310.869839,242.343239 316.692103,243.038403 326.311007,243.038403C345.108664,243.038403 345.108664,268.960973 326.311007,268.960973C316.670671,268.960973 310.856091,269.653718 305.654329,271.506293C299.720746,273.619503 293.817117,277.609258 286.671829,284.754431C273.452860,297.972850 270.409264,306.519798 270.409264,325.999661C270.409264,343.281375 242.212779,343.281375 242.212779,325.999661C242.212779,306.493216 239.183615,297.987621 225.949991,284.754209C218.814650,277.618831 212.905626,273.628024 206.962255,271.511508C201.752204,269.656137 195.929940,268.960973 186.311036,268.960973C167.513379,268.960973 167.513379,243.038403 186.311036,243.038403C195.951372,243.038403 201.765952,242.345658 206.967713,240.493083C212.901296,238.379873 218.804926,234.390118 225.950214,227.244945C239.169183,214.026526 242.212779,205.479578 242.212779,185.999715C242.212779,168.718001 270.409264,168.718001 270.409264,185.999715Z";
window.customIcons = window.customIcons || {};
window.customIcons["modes-plus"] = {
  getIcon: async (name) => name === "logo" ? { path: LOGO_PATH, viewBox: "0 0 513 512" } : undefined,
};

const DURATIONS = [[0, "until_cleared"], [30, "30_minutes"], [60, "1_hour"], [120, "2_hours"], [480, "8_hours"]];


class ModesView extends HTMLElement {
  _t(key, values) { return localize(this._hass, messages, key, values); }

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
  set narrow(value) { this._narrow = value; const menu = this.shadowRoot.querySelector("ha-menu-button"); if (menu) menu.narrow = value; }
  get narrow() { return this._narrow; }
  set hass(value) {
    const previous = this._hass;
    this._hass = value;
    applyPreferences(this, value);
    const menu = this.shadowRoot.querySelector("ha-menu-button");
    if (menu) menu.hass = value;
    if (value.connection && !this._nativeLoading && !this._nativeReady) this._loadNative();
    if (!this.isConnected) return;
    const changed = !previous || Object.keys(value.states).some(key => value.states[key].attributes.mode_id && value.states[key] !== previous.states[key]) || Object.keys(previous.states).some(key => previous.states[key].attributes.mode_id && !value.states[key]);
    if (changed || !this._data) this._refresh();
    else if (previous?.locale !== value.locale && !this._busy && !this.shadowRoot.activeElement) this._render();
  }
  async _loadNative() {
    this._nativeLoading = true;
    try {
      await loadNativeComponents(this);
      this._nativeReady = true;
      this._uiError = "";
    } catch (error) {
      this._uiError = error.message;
    } finally {
      this._nativeLoading = false;
      if (this.isConnected) this._render();
    }
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
    } catch (error) { this._error = error.message || this._t("unable_to_load_modes"); }
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
    try { await request(); showToast(this, this._t("changes_applied")); }
    catch (error) { this._error = error.message || this._t("the_action_failed_try_again"); }
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
    focusControl(this.shadowRoot.querySelector(`[data-control="${key}"]`));
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
    if (!groups.length) return el("p", this._t("create_a_mode_in_devices_services_to_get_started"), "ha-plus-muted");
    let group = groups.find(item => item.key === this._selection.group);
    if (!group) {
      group = groups[0];
      this._selection.group = group.key;
      this._selection.mode = group.members.find(mode => mode.active)?.id || "";
    }
    if (!group.members.some(mode => mode.id === this._selection.mode)) this._selection.mode = "";
    const form = el("div", undefined, "controls ha-plus-form-grid");
    form.append(
      dropdown("group", this._t("group"), groups.map(item => ({ value: item.key, label: item.name })), group.key, value => this._choose("group", value), this._busy, this._hass),
      dropdown("mode", this._t("mode"), [{ value: "", label: this._t("none_normal_behavior") }, ...group.members.map(mode => ({ value: mode.id, label: mode.name }))], this._selection.mode, value => this._choose("mode", value), this._busy || !group.members.length, this._hass),
      dropdown("duration", this._t("duration"), DURATIONS.map(([value, label]) => ({ value, label: this._t(label) })), this._selection.duration, value => this._choose("duration", value), this._busy || !this._selection.mode, this._hass),
      button(this._t("apply"), () => this._apply(group), this._busy || !group.members.length, "primary"),
    );
    return form;
  }
  _modeDetails(mode) {
    const detail = el("details");
    detail.append(el("summary", this._t("priority", { value1: mode.name, value2: mode.priority })));
    for (const [key, effect] of Object.entries(mode.effects)) {
      const owner = this._data.modes.find(item => item.id === this._data.effects[key]?.mode_id);
      const name = this._hass.states[key]?.attributes.friendly_name || key;
      const row = el("p");
      row.append(button(name, () => showMoreInfo(this, key), !this._hass.states[key], "ha-plus-text-button"), el("span", ` · ${effect.state}`));
      if (effect.brightness != null) row.append(el("span", this._t("brightness", { value: Math.round(effect.brightness / 255 * 100) })));
      if (mode.active && owner && owner.id !== mode.id) row.append(el("span", this._t("overridden_by", { name: owner.name })));
      detail.append(row);
    }
    for (const [key, value] of Object.entries(mode.values)) detail.append(el("p", `${key}: ${value}`));
    if (!Object.keys(mode.effects).length && !Object.keys(mode.values).length) detail.append(el("p", this._t("no_managed_settings_use_this_mode_as_an_automation_condition"), "ha-plus-muted"));
    return detail;
  }
  _groupCard(group) {
    const active = group.members.find(mode => mode.active);
    const card = el("ha-card", undefined, `group ha-plus-group ha-plus-padded-card${active ? " active" : ""}`);
    const row = el("div", undefined, "ha-plus-row");
    row.append(icon(active?.icon || "mdi:layers-outline"), el("h3", group.name));
    card.append(row, el("p", active?.name || this._t("normal_behavior"), "group-state ha-plus-value"));
    if (active) {
      card.append(el("p", this._t("started", { value1: formatDateTime(this._hass, active.active.since), value2: active.active.source }), "ha-plus-muted"));
      if (active.active.until) card.append(el("p", this._t("ends", { value1: formatDateTime(this._hass, active.active.until) }), "ha-plus-muted"));
      const owned = [...Object.values(this._data.effects), ...Object.values(this._data.values)].filter(item => item.mode_id === active.id).length;
      const total = Object.keys(active.effects).length + Object.keys(active.values).length;
      card.append(el("p", this._t("effective_overridden", { value1: owned, value2: total - owned }), "ha-plus-muted"));
    }
    const chips = el("div", undefined, "ha-plus-chips");
    for (const mode of group.members) {
      const chip = el("span", undefined, `chip ha-plus-chip${mode.active ? " active" : ""}`);
      chip.append(icon(mode.icon || "mdi:home-switch"), el("span", mode.name));
      chip.setAttribute("aria-label", `${mode.name}: ${this._t(mode.active ? "active" : "inactive")}`);
      chips.append(chip);
    }
    card.append(chips);
    if (!group.members.length) card.append(el("p", this._t("no_modes_yet_choose_this_group_when_adding_a_mode_in_devices_services"), "ha-plus-muted"));
    for (const mode of group.members) card.append(this._modeDetails(mode));
    return card;
  }
  _newGroup() {
    const detail = el("details", undefined, "create-group ha-plus-create");
    detail.open = Boolean(this._creatingGroup);
    detail.addEventListener("toggle", () => { this._creatingGroup = detail.open; });
    detail.append(el("summary", this._t("create_group")));
    const form = el("form");
    const { field, input } = textField(this._t("group_name"), {
      name: "group_name", required: true, maxLength: 80, disabled: this._busy,
    });
    input.value = this._groupDraft || "";
    input.dataset.control = "new-group";
    input.addEventListener("input", () => { this._groupDraft = input.value; });
    const submit = el("button", this._t("create_group"));
    submit.type = "submit";
    submit.disabled = this._busy;
    form.append(field, submit);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      this._perform(async () => {
        const result = await this._hass.callWS({ type: "modes_plus/create_group", name });
        this._groupDraft = "";
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
      root.append(panelHeader("HA+ Modes", { hass: this._hass, narrow: this.narrow,
        domain: DOMAIN, iconUrl: "/modes_plus/icon.png",
        onRefresh: () => this._refresh(), refreshing: this._loading }));
    }
    const main = el("main", undefined, compact ? "ha-plus-compact-content" : "ha-plus-content");
    root.append(main);
    if (compact) main.append(el("h2", this._config?.title || this._t("home_modes")));
    if (this._uiError) {
      const error = notice(this._uiError, "error");
      error.append(button(this._t("common.retry"), () => this._loadNative()));
      main.append(error);
    }
    if (this._error) {
      const error = notice(this._error, "error");
      error.append(button(this._t("common.retry"), () => this._refresh()));
      main.append(error);
    }
    if (!this._data) {
      if (!this._error) main.append(notice(this._t("loading_modes"), "loading"));
      this.shadowRoot.append(root);
      return;
    }
    let modes = [...this._data.modes].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
    const groups = this._groups(modes);
    this._currentGroups = groups;
    const controls = compact ? el("section") : el("ha-card", undefined, "ha-plus-padded-card");
    if (!compact) controls.append(el("h2", this._t("choose_a_household_setting")));
    controls.append(this._controls(groups));
    if (!compact) {
      controls.append(el("p", this._t("each_group_has_one_selected_mode_different_groups_can_stay_active_together_higher_pri"), "ha-plus-muted"));
      if (this._hass.user?.is_admin) {
        controls.append(this._newGroup(), button(this._t("add_mode"), () => navigate(this, integrationUrl(DOMAIN, true))));
      }
    }
    main.append(controls);
    if (!compact) main.append(el("h2", this._t("your_groups")));
    const grid = el("section", undefined, "grid ha-plus-card-grid");
    for (const group of groups) grid.append(this._groupCard(group));
    main.append(grid);
    const errors = Object.entries(this._data.errors);
    if (errors.length) {
      const box = el("div", undefined, "notice error");
      box.setAttribute("role", "alert");
      box.append(el("p", this._t("some_device_actions_need_attention")));
      if (!compact) for (const [key, error] of errors) box.append(el("p", `${key}: ${error}`));
      const link = el("a", this._t("view_details"));
      link.href = "/ha-plus-modes";
      box.append(link, button(this._t("retry_device_actions"), () => this._action("retry", {}), this._busy));
      main.append(box);
    }
    if (!compact) {
      const explain = el("ha-card", undefined, "ha-plus-padded-card");
      explain.append(el("h2", this._t("effective_settings")));
      for (const [key, item] of Object.entries(this._data.effects)) {
        const owner = this._data.modes.find(mode => mode.id === item.mode_id);
        explain.append(el("div", `${this._hass.states[key]?.attributes.friendly_name || key} → ${item.desired.state}${item.desired.brightness ? ` · ${Math.round(item.desired.brightness / 255 * 100)}%` : ""} · ${owner?.group ? owner.group + " / " : ""}${owner?.name || item.mode_id}`, "ha-plus-detail-row"));
      }
      for (const [key, item] of Object.entries(this._data.values)) {
        const owner = this._data.modes.find(mode => mode.id === item.mode_id);
        explain.append(el("div", `${key} → ${item.value} · ${owner?.group ? owner.group + " / " : ""}${owner?.name}`, "ha-plus-detail-row"));
      }
      if (!Object.keys(this._data.effects).length && !Object.keys(this._data.values).length) explain.append(el("p", this._t("no_settings_are_currently_controlled_by_modes"), "ha-plus-muted"));
      main.append(explain);
      const history = el("details");
      history.append(el("summary", this._t("recent_changes")));
      for (const item of this._data.history) history.append(el("p", `${item.mode} ${item.active ? "selected" : "cleared"} · ${formatDateTime(this._hass, item.at)}`, "ha-plus-muted"));
      main.append(history);
      if (this._hass.user?.is_admin) {
        const link = el("a", this._t("add_or_configure_modes_in_devices_services"));
        link.href = "/config/integrations/integration/modes_plus";
        main.append(link);
      }
    }
    this.shadowRoot.append(root);
    if (focused) focusControl(this.shadowRoot.querySelector(`[data-control="${focused}"]`));
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
  static getStubConfig() { return { title: this._t("home_modes") }; }
}
if (!customElements.get("modes-plus-panel")) customElements.define("modes-plus-panel", ModesPlusPanel);
if (!customElements.get("modes-plus-card")) customElements.define("modes-plus-card", ModesPlusCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === "modes-plus-card")) window.customCards.push({ type: "modes-plus-card", name: "HA+ Modes", description: t("groups_household_settings_and_temporary_overrides"), preview: true });
