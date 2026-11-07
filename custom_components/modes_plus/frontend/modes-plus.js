(() => {
  // node_modules/@ha-plus/ui/src/styles.js
  var themeStyles = `
  :host { display:block; color:var(--primary-text-color,#212121); font-family:var(--primary-font-family,var(--paper-font-body1_-_font-family,Roboto,sans-serif)); }
  *, *::before, *::after { box-sizing:border-box; }
  [hidden] { display:none !important; }
  a { color:var(--primary-color,#03a9f4); }
  ha-icon { flex-shrink:0; }
  button, input, select, textarea { font:inherit; }
  button { min-height:44px; padding:10px 16px; border:0; border-radius:var(--ha-button-border-radius,999px); background:var(--secondary-background-color,#f5f5f5); color:var(--primary-color,#03a9f4); cursor:pointer; font-weight:500; }
  button:hover { filter:brightness(.96); }
  button.primary { background:var(--primary-color,#03a9f4); color:var(--text-primary-color,#fff); }
  button.danger { color:var(--error-color,#db4437); }
  button:disabled { opacity:.5; cursor:default; }
  :is(button,input,select,textarea,a,summary,[tabindex]):focus-visible { outline:2px solid var(--primary-color,#03a9f4); outline-offset:3px; }
  .icon-button { display:grid; place-items:center; width:44px; height:44px; min-width:44px; padding:0; border-radius:50%; color:inherit; background:transparent; }
  .icon-button:hover { background:var(--secondary-background-color,#f5f5f5); }
  input:not([type=checkbox]):not([type=radio]), textarea { min-height:48px; border:1px solid var(--divider-color,#e0e0e0); border-radius:var(--ha-input-border-radius,14px); padding:10px 14px; color:var(--primary-text-color,#212121); background:var(--secondary-background-color,#f5f5f5); max-width:100%; }
  ha-card { display:block; background:var(--ha-card-background,var(--card-background-color,#fff)); color:var(--primary-text-color,#212121); border-radius:var(--ha-card-border-radius,12px); box-shadow:var(--ha-card-box-shadow,none); border:var(--ha-card-border-width,1px) solid var(--ha-card-border-color,var(--divider-color,#e0e0e0)); }
  .field { position:relative; min-width:0; }
  .field-label { display:block; margin-bottom:8px; color:var(--secondary-text-color,#727272); font-size:14px; }
  .combobox { display:flex; align-items:center; gap:8px; width:100%; justify-content:space-between; text-align:start; border:1px solid var(--divider-color,#e0e0e0); border-radius:14px; color:var(--primary-text-color,#212121); min-height:48px; padding:10px 14px; }
  .combobox span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .listbox { position:absolute; z-index:10; inset-inline:0; top:100%; margin-top:4px; max-height:300px; overflow:auto; padding:6px; background:var(--card-background-color,#fff); border:1px solid var(--divider-color,#e0e0e0); border-radius:14px; box-shadow:var(--ha-card-box-shadow,0 4px 16px #0003); }
  .option { display:block; width:100%; text-align:start; border-radius:10px; background:transparent; color:var(--primary-text-color,#212121); white-space:normal; overflow-wrap:anywhere; }
  .option[aria-selected=true] { color:var(--primary-color,#03a9f4); background:var(--secondary-background-color,#f5f5f5); }
  .ha-plus-header { display:flex; align-items:center; gap:12px; padding:12px 16px; min-height:64px; background:var(--app-header-background-color,var(--primary-background-color,#fafafa)); color:var(--app-header-text-color,var(--primary-text-color,#212121)); }
  .ha-plus-header h1 { font-size:20px; font-weight:400; flex:1; margin:0; }
  .ha-plus-content { max-width:1000px; margin:auto; padding:24px; }
  .notice { padding:12px 16px; margin-bottom:16px; background:var(--secondary-background-color,#f5f5f5); border-radius:14px; overflow-wrap:anywhere; }
  .error { color:var(--error-color,#db4437); white-space:pre-wrap; }
  dialog { font:inherit; background:var(--ha-card-background,var(--card-background-color,#fff)); color:var(--primary-text-color,#212121); border:1px solid var(--divider-color,#e0e0e0); border-radius:var(--ha-dialog-border-radius,20px); padding:24px; width:420px; max-width:calc(100% - 32px); max-height:calc(100% - 32px); overflow:auto; }
  dialog::backdrop { background:#0008; }
  dialog h2 { margin:0 0 16px; font-size:1.3rem; }
  dialog p { white-space:pre-line; overflow-wrap:anywhere; }
  dialog form { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:12px; margin-top:24px; }
  @media(max-width:700px) { .ha-plus-content { padding:16px; } .ha-plus-header h1 { font-size:18px; } }
`;
  var appStyles = `${themeStyles}
  :host {
    container-type: inline-size;
  }

  h2 {
    font-size: 20px;
    font-weight: 500;
    margin: 0 0 16px;
  }

  h3 {
    font-size: 16px;
    margin: 0;
  }

  p {
    line-height: 1.5;
  }

  section {
    margin-bottom: 24px;
  }

  details {
    margin-top: 16px;
  }

  summary {
    cursor: pointer;
    padding: 8px 0;
  }

  .ha-plus-muted,
  .ha-plus-message {
    color: var(--secondary-text-color, #727272);
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .ha-plus-message {
    align-self: center;
  }

  .ha-plus-padded-card {
    padding: 20px;
    margin-bottom: 20px;
  }

  .ha-plus-row,
  .ha-plus-chips,
  .ha-plus-card-actions,
  .ha-plus-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ha-plus-row h3 {
    flex: 1;
  }

  .ha-plus-chips {
    margin-top: 12px;
  }

  .ha-plus-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 7px 12px;
    border-radius: 999px;
    background: var(--secondary-background-color, #f5f5f5);
    border: 1px solid var(--divider-color, #e0e0e0);
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .ha-plus-chip.active {
    color: var(--primary-color, #03a9f4);
    background: var(--primary-color-light, var(--secondary-background-color, #f5f5f5));
    border-color: var(--primary-color, #03a9f4);
  }

  .ha-plus-chip ha-icon {
    --mdc-icon-size: 18px;
  }

  .ha-plus-form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    align-items: end;
    gap: 12px;
  }

  .ha-plus-group {
    border-inline-start: 4px solid var(--divider-color, #e0e0e0);
  }

  .ha-plus-group.active {
    border-inline-start-color: var(--primary-color, #03a9f4);
  }

  .ha-plus-value {
    margin: 12px 0 4px;
    font-size: 20px;
    font-weight: 500;
  }

  .ha-plus-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
    gap: 16px;
  }

  .ha-plus-card-grid > ha-card {
    margin: 0;
  }

  .ha-plus-detail-row {
    padding: 12px 0;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    overflow-wrap: anywhere;
  }

  .ha-plus-detail-row:last-child {
    border: 0;
  }

  .ha-plus-create {
    margin: 16px 0;
  }

  .ha-plus-create form {
    display: flex;
    align-items: end;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .ha-plus-compact-content {
    padding: 16px;
  }

  .ha-plus-compact .ha-plus-form-grid {
    grid-template-columns: 1fr;
  }

  .ha-plus-compact .ha-plus-card-grid {
    display: block;
  }

  .ha-plus-compact .ha-plus-group {
    margin-bottom: 12px;
    padding: 12px;
  }

  .ha-plus-detail-card {
    overflow: hidden;
  }

  .ha-plus-card-header {
    display: grid;
    align-items: center;
    cursor: pointer;
    gap: 16px;
    grid-template-columns: 64px minmax(0, 1fr);
    padding: 20px 20px 12px;
  }

  .ha-plus-card-header h2 {
    line-height: 1.3;
    margin-bottom: 4px;
    overflow-wrap: anywhere;
  }

  .ha-plus-card-header:focus-visible {
    outline-offset: -2px;
  }

  .ha-plus-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 50%;
    height: 64px;
    width: 64px;
    overflow: hidden;
  }

  .ha-plus-avatar img {
    height: 100%;
    width: 100%;
    object-fit: cover;
  }

  .ha-plus-avatar ha-icon {
    color: var(--primary-color, #03a9f4);
    --mdc-icon-size: 34px;
  }

  .ha-plus-status {
    font-weight: 500;
    text-transform: capitalize;
    overflow-wrap: anywhere;
  }

  [data-tone=success] {
    color: var(--success-color, #43a047);
  }

  [data-tone=warning] {
    color: var(--warning-color, #ff9800);
  }

  [data-tone=error] {
    color: var(--error-color, #db4437);
  }

  .ha-plus-description {
    color: var(--secondary-text-color, #727272);
    margin: 0;
    padding: 0 20px 16px;
    overflow-wrap: anywhere;
  }

  .ha-plus-stats {
    display: grid;
    gap: 1px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    background: var(--divider-color, #e0e0e0);
    border-block: 1px solid var(--divider-color, #e0e0e0);
  }

  .ha-plus-stat {
    display: grid;
    align-items: center;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 10px;
    min-height: 64px;
    padding: 10px 14px;
    border: 0;
    border-radius: 0;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #212121);
    text-align: start;
  }

  .ha-plus-stat:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .ha-plus-stat ha-icon {
    color: var(--state-icon-color, #44739e);
  }

  .ha-plus-stat-label {
    color: var(--secondary-text-color, #727272);
    display: block;
    font-size: 0.78rem;
  }

  .ha-plus-stat-value {
    display: block;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ha-plus-card-actions {
    padding: 16px 20px 20px;
  }

  .ha-plus-feedback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    max-width: 100%;
    position: relative;
    overflow: hidden;
  }

  button.ha-plus-feedback.success {
    background: var(--success-color, #43a047);
    opacity: 1;
    cursor: default;
  }

  .ha-plus-feedback.success::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: #fff6;
    animation: ha-plus-splash 600ms ease-out forwards;
  }

  .ha-plus-feedback.success ha-icon {
    animation: ha-plus-check-in 350ms ease-out;
  }

  .ha-plus-toolbar {
    gap: 12px;
    margin-bottom: 16px;
  }

  .ha-plus-toolbar button[aria-pressed=true] {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
  }

  .ha-plus-table {
    overflow-x: auto;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: var(--ha-card-border-radius, 12px);
  }

  .ha-plus-table table {
    border-collapse: collapse;
    width: 100%;
    white-space: nowrap;
  }

  .ha-plus-table th,
  .ha-plus-table td {
    text-align: start;
    padding: 12px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }

  .ha-plus-table input[type=checkbox] {
    width: 20px;
    height: 20px;
    accent-color: var(--primary-color, #03a9f4);
    cursor: pointer;
  }

  .ha-plus-text-button {
    background: transparent;
    border: 0;
    padding: 4px;
    text-align: start;
  }

  @keyframes ha-plus-splash {
    from { transform: scale(0); opacity: 1; }
    to { transform: scale(2); opacity: 0; }
  }

  @keyframes ha-plus-check-in {
    from { transform: scale(0.4); }
    to { transform: scale(1); }
  }

  @media (max-width: 700px) {
    .ha-plus-form-grid {
      grid-template-columns: 1fr 1fr;
    }

    .ha-plus-form-grid .field:first-child,
    .ha-plus-form-grid .primary {
      grid-column: 1 / -1;
    }
  }

  @container (max-width: 420px) {
    .ha-plus-stats {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ha-plus-feedback.success::after,
    .ha-plus-feedback.success ha-icon {
      animation: none;
    }

    .ha-plus-feedback.success::after {
      display: none;
    }
  }
`;

  // node_modules/@ha-plus/ui/src/index.js
  /*! @ha-plus/ui v0.2.0 | MIT | Copyright (c) 2026 HA+ contributors | https://github.com/zvikarp/ha-plus-packages/blob/main/LICENSE */
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== void 0) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function icon(name) {
    const node = el("ha-icon");
    node.setAttribute("icon", name);
    return node;
  }
  function button(text, handler, disabled = false, className) {
    const node = el("button", text, className);
    node.type = "button";
    node.disabled = disabled;
    node.addEventListener("click", handler);
    return node;
  }
  var nextId = 0;
  function dropdown(key, label, options, value, change, disabled) {
    const field = el("div", void 0, "field");
    const labelNode = el("span", label, "field-label");
    labelNode.id = `ha-plus-label-${++nextId}`;
    const trigger = button(void 0, () => setOpen(menu.hidden), disabled, "combobox");
    trigger.dataset.control = key;
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-labelledby", labelNode.id);
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.append(el("span", options.find((option) => option.value === value)?.label || "Choose\u2026"), icon("mdi:chevron-down"));
    const menu = el("div", void 0, "listbox");
    menu.id = `ha-plus-list-${nextId}`;
    menu.hidden = true;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-labelledby", labelNode.id);
    trigger.setAttribute("aria-controls", menu.id);
    const choices = options.map((option) => {
      const item = button(option.label, () => {
        setOpen(false);
        change(option.value);
      }, false, "option");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.value === value));
      item.tabIndex = -1;
      menu.append(item);
      return item;
    });
    function setOpen(open) {
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      if (open) choices[Math.max(0, options.findIndex((option) => option.value === value))]?.focus();
      else trigger.focus();
    }
    field.addEventListener("keydown", (event) => {
      const index = choices.indexOf(event.target);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        if (menu.hidden) setOpen(true);
        else {
          let target = 0;
          if (event.key === "End") target = choices.length - 1;
          if (event.key === "ArrowDown") target = (index + 1) % choices.length;
          if (event.key === "ArrowUp") target = (index - 1 + choices.length) % choices.length;
          choices[target]?.focus();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    });
    field.addEventListener("focusout", (event) => {
      if (!field.contains(event.relatedTarget)) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    field.append(labelNode, trigger, menu);
    return field;
  }
  function textField(label, { name, required = false, maxLength, disabled = false } = {}) {
    const field = el("label", void 0, "field");
    field.append(el("span", label, "field-label"));
    const input = el("input");
    input.type = "text";
    if (name !== void 0) input.name = name;
    input.required = required;
    if (maxLength !== void 0) input.maxLength = maxLength;
    input.disabled = disabled;
    input.autocomplete = "off";
    field.append(input);
    return { field, input };
  }
  function panelHeader(title, { hass, narrow, actions = [] } = {}) {
    const header = el("header", void 0, "ha-plus-header");
    const menu = el("ha-menu-button");
    menu.hass = hass;
    menu.narrow = narrow;
    header.append(menu, el("h1", title), ...actions);
    return header;
  }
  function notice(message, kind = "status") {
    if (!["status", "loading", "empty", "error"].includes(kind)) {
      throw new TypeError("Unknown notice kind");
    }
    const node = el("div", message, kind === "error" ? "notice error" : "notice");
    node.setAttribute("role", kind === "error" ? "alert" : "status");
    node.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    if (kind === "loading") node.setAttribute("aria-busy", "true");
    return node;
  }

  // src/modes-plus.js
  var DOMAIN = "modes_plus";
  var LOGO_PATH = "M486.311003,109.999628L486.311003,401.999167C486.311003,448.360304 448.671798,485.999328 402.310872,485.999328L110.310822,485.999328C63.949897,485.999328 26.310691,448.360304 26.310691,401.999167L26.310691,385.540691L257.810744,385.540691C329.306921,385.540691 387.352601,327.495493 387.352601,255.999398C387.352601,184.503302 329.306921,126.458104 257.810744,126.458104L26.310691,126.458104L26.310691,109.999628C26.310691,63.638491 63.949897,25.999467 110.310822,25.999467L402.310872,25.999467C448.671798,25.999467 486.311003,63.638491 486.311003,109.999628ZM360.269124,255.999398C360.269124,312.547517 314.359153,358.457719 257.810744,358.457719L26.310691,358.457719L26.310691,153.541076L257.810744,153.541076C314.359153,153.541076 360.269124,199.451278 360.269124,255.999398ZM164.561139,255.999398C164.561139,306.637712 205.672754,347.749342 256.310847,347.749342C306.948940,347.749342 348.060555,306.637712 348.060555,255.999398C348.060555,205.361083 306.948940,164.249453 256.310847,164.249453C205.672754,164.249453 164.561139,205.361083 164.561139,255.999398ZM270.409264,185.999715C270.409264,205.506160 273.438428,214.011755 286.672051,227.245167C293.807392,234.380545 299.716417,238.371353 305.659787,240.487868C310.869839,242.343239 316.692103,243.038403 326.311007,243.038403C345.108664,243.038403 345.108664,268.960973 326.311007,268.960973C316.670671,268.960973 310.856091,269.653718 305.654329,271.506293C299.720746,273.619503 293.817117,277.609258 286.671829,284.754431C273.452860,297.972850 270.409264,306.519798 270.409264,325.999661C270.409264,343.281375 242.212779,343.281375 242.212779,325.999661C242.212779,306.493216 239.183615,297.987621 225.949991,284.754209C218.814650,277.618831 212.905626,273.628024 206.962255,271.511508C201.752204,269.656137 195.929940,268.960973 186.311036,268.960973C167.513379,268.960973 167.513379,243.038403 186.311036,243.038403C195.951372,243.038403 201.765952,242.345658 206.967713,240.493083C212.901296,238.379873 218.804926,234.390118 225.950214,227.244945C239.169183,214.026526 242.212779,205.479578 242.212779,185.999715C242.212779,168.718001 270.409264,168.718001 270.409264,185.999715Z";
  window.customIcons = window.customIcons || {};
  window.customIcons["modes-plus"] = {
    getIcon: async (name) => name === "logo" ? { path: LOGO_PATH, viewBox: "0 0 513 512" } : void 0
  };
  var DURATIONS = [[0, "Until cleared"], [30, "30 minutes"], [60, "1 hour"], [120, "2 hours"], [480, "8 hours"]];
  function when(value) {
    return new Date(value).toLocaleString();
  }
  var ModesView = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._busy = false;
      this._generation = 0;
      this._selection = { group: "", mode: "", duration: 0 };
      this._outside = (event) => {
        for (const field of this.shadowRoot.querySelectorAll(".field")) {
          if (!event.composedPath().includes(field)) {
            const menu = field.querySelector(".listbox");
            if (menu) menu.hidden = true;
            field.querySelector(".combobox")?.setAttribute("aria-expanded", "false");
          }
        }
      };
    }
    set narrow(value) {
      this._narrow = value;
      if (this._data) this._render();
    }
    get narrow() {
      return this._narrow;
    }
    set hass(value) {
      const previous = this._hass;
      this._hass = value;
      if (!this.isConnected) return;
      const changed = !previous || Object.keys(value.states).some((key) => value.states[key].attributes.mode_id && value.states[key] !== previous.states[key]) || Object.keys(previous.states).some((key) => previous.states[key].attributes.mode_id && !value.states[key]);
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
      if (this._loading) {
        this._again = true;
        return;
      }
      this._loading = true;
      const generation = this._generation;
      if (!this._data) this._render();
      try {
        const data = await this._hass.callWS({ type: "modes_plus/snapshot" });
        if (generation === this._generation) {
          this._data = data;
          this._error = "";
        }
      } catch (error) {
        this._error = error.message || "Unable to load modes.";
      } finally {
        this._loading = false;
        if (this.isConnected) this._render();
        if (this._again && this.isConnected) {
          this._again = false;
          this._refresh();
        }
      }
    }
    async _perform(request) {
      this._busy = true;
      this._error = "";
      this._render();
      try {
        await request();
      } catch (error) {
        this._error = error.message || "The action failed. Try again.";
      } finally {
        this._busy = false;
        const error = this._error;
        await this._refresh();
        if (error) {
          this._error = error;
          this._render();
        }
      }
    }
    _action(service, data) {
      return this._perform(() => this._hass.callService(DOMAIN, service, data));
    }
    _groups(modes) {
      const groups = new Map((this._data.groups || []).map((name) => [`group:${name}`, { key: `group:${name}`, name, group: name, members: [] }]));
      for (const mode of modes) {
        const key = mode.group ? `group:${mode.group}` : `mode:${mode.id}`;
        if (!groups.has(key)) groups.set(key, { key, name: mode.group || mode.name, group: mode.group || "", members: [] });
        groups.get(key).members.push(mode);
      }
      return [...groups.values()].filter((group) => !this._config?.modes?.length || group.members.some((mode) => this._config.modes.includes(mode.id))).sort((a, b) => a.name.localeCompare(b.name));
    }
    _choose(key, value) {
      this._selection[key] = value;
      if (key === "group") {
        this._selection.duration = 0;
        const group = this._currentGroups.find((item) => item.key === value);
        this._selection.mode = group?.members.find((mode) => mode.active)?.id || "";
      }
      this._render();
      this.shadowRoot.querySelector(`[data-control="${key}"]`)?.focus();
    }
    _apply(group) {
      return this._action("select", {
        group: group.group,
        mode_id: this._selection.mode,
        duration: Number(this._selection.duration),
        ...!group.group ? { standalone_mode_id: group.members[0].id } : {}
      });
    }
    _controls(groups) {
      if (!groups.length) return el("p", "Create a mode in Devices & services to get started.", "ha-plus-muted");
      let group = groups.find((item) => item.key === this._selection.group);
      if (!group) {
        group = groups[0];
        this._selection.group = group.key;
        this._selection.mode = group.members.find((mode) => mode.active)?.id || "";
      }
      if (!group.members.some((mode) => mode.id === this._selection.mode)) this._selection.mode = "";
      const form = el("div", void 0, "controls ha-plus-form-grid");
      form.append(
        dropdown("group", "Group", groups.map((item) => ({ value: item.key, label: item.name })), group.key, (value) => this._choose("group", value), this._busy),
        dropdown("mode", "Mode", [{ value: "", label: "None \xB7 normal behavior" }, ...group.members.map((mode) => ({ value: mode.id, label: mode.name }))], this._selection.mode, (value) => this._choose("mode", value), this._busy || !group.members.length),
        dropdown("duration", "Duration", DURATIONS.map(([value, label]) => ({ value, label })), this._selection.duration, (value) => this._choose("duration", value), this._busy || !this._selection.mode),
        button("Apply", () => this._apply(group), this._busy || !group.members.length, "primary")
      );
      return form;
    }
    _modeDetails(mode) {
      const detail = el("details");
      detail.append(el("summary", `${mode.name} \xB7 priority ${mode.priority}`));
      for (const [key, effect] of Object.entries(mode.effects)) {
        const owner = this._data.modes.find((item) => item.id === this._data.effects[key]?.mode_id);
        const name = this._hass.states[key]?.attributes.friendly_name || key;
        detail.append(el("p", `${name}: ${effect.state}${effect.brightness ? ` \xB7 brightness ${Math.round(effect.brightness / 255 * 100)}%` : ""}${mode.active && owner && owner.id !== mode.id ? ` \xB7 overridden by ${owner.name}` : ""}`));
      }
      for (const [key, value] of Object.entries(mode.values)) detail.append(el("p", `${key}: ${value}`));
      if (!Object.keys(mode.effects).length && !Object.keys(mode.values).length) detail.append(el("p", "No managed settings. Use this mode as an automation condition.", "ha-plus-muted"));
      return detail;
    }
    _groupCard(group) {
      const active = group.members.find((mode) => mode.active);
      const card = el("ha-card", void 0, `group ha-plus-group ha-plus-padded-card${active ? " active" : ""}`);
      const row = el("div", void 0, "ha-plus-row");
      row.append(icon(active?.icon || "mdi:layers-outline"), el("h3", group.name));
      card.append(row, el("p", active?.name || "Normal behavior", "group-state ha-plus-value"));
      if (active) {
        card.append(el("p", `Started ${when(active.active.since)} \xB7 ${active.active.source}`, "ha-plus-muted"));
        if (active.active.until) card.append(el("p", `Ends ${when(active.active.until)}`, "ha-plus-muted"));
        const owned = [...Object.values(this._data.effects), ...Object.values(this._data.values)].filter((item) => item.mode_id === active.id).length;
        const total = Object.keys(active.effects).length + Object.keys(active.values).length;
        card.append(el("p", `${owned} effective \xB7 ${total - owned} overridden`, "ha-plus-muted"));
      }
      const chips = el("div", void 0, "ha-plus-chips");
      for (const mode of group.members) {
        const chip = el("span", void 0, `chip ha-plus-chip${mode.active ? " active" : ""}`);
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
      const detail = el("details", void 0, "create-group ha-plus-create");
      detail.append(el("summary", "Create group"));
      const form = el("form");
      const { field, input } = textField("Group name", {
        name: "group_name",
        required: true,
        maxLength: 80,
        disabled: this._busy
      });
      const submit = el("button", "Create group");
      submit.type = "submit";
      submit.disabled = this._busy;
      form.append(field, submit);
      form.addEventListener("submit", (event) => {
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
      const root = el(compact ? "ha-card" : "div", void 0, compact ? "ha-plus-compact" : "");
      if (!compact) {
        const refresh = button(void 0, () => this._refresh(), this._loading, "icon-button");
        refresh.setAttribute("aria-label", "Refresh modes");
        refresh.title = "Refresh modes";
        refresh.append(icon("mdi:refresh"));
        root.append(panelHeader("HA+ Modes", { hass: this._hass, narrow: this.narrow, actions: [refresh] }));
      }
      const main = el("main", void 0, compact ? "ha-plus-compact-content" : "ha-plus-content");
      root.append(main);
      if (compact) main.append(el("h2", this._config?.title || "Home modes"));
      if (this._error) {
        const error = notice(this._error, "error");
        error.append(button("Retry", () => this._refresh()));
        main.append(error);
      }
      if (!this._data) {
        if (!this._error) main.append(notice("Loading modes\u2026", "loading"));
        this.shadowRoot.append(root);
        return;
      }
      let modes = [...this._data.modes].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
      const groups = this._groups(modes);
      this._currentGroups = groups;
      const controls = compact ? el("section") : el("ha-card", void 0, "ha-plus-padded-card");
      if (!compact) controls.append(el("h2", "Choose a household setting"));
      controls.append(this._controls(groups));
      if (!compact) {
        controls.append(el("p", "Each group has one selected mode. Different groups can stay active together; higher priorities override conflicting settings. Choose None to clear a group.", "ha-plus-muted"));
        if (this._hass.user?.is_admin) controls.append(this._newGroup());
      }
      main.append(controls);
      if (!compact) main.append(el("h2", "Your groups"));
      const grid = el("section", void 0, "grid ha-plus-card-grid");
      for (const group of groups) grid.append(this._groupCard(group));
      main.append(grid);
      const errors = Object.entries(this._data.errors);
      if (errors.length) {
        const box = el("div", void 0, "notice error");
        box.setAttribute("role", "alert");
        box.append(el("p", "Some device actions need attention."));
        if (!compact) for (const [key, error] of errors) box.append(el("p", `${key}: ${error}`));
        const link = el("a", "View details");
        link.href = "/ha-plus-modes";
        box.append(link, button("Retry device actions", () => this._action("retry", {}), this._busy));
        main.append(box);
      }
      if (!compact) {
        const explain = el("ha-card", void 0, "ha-plus-padded-card");
        explain.append(el("h2", "Effective settings"));
        for (const [key, item] of Object.entries(this._data.effects)) {
          const owner = this._data.modes.find((mode) => mode.id === item.mode_id);
          explain.append(el("div", `${this._hass.states[key]?.attributes.friendly_name || key} \u2192 ${item.desired.state}${item.desired.brightness ? ` \xB7 ${Math.round(item.desired.brightness / 255 * 100)}%` : ""} \xB7 ${owner?.group ? owner.group + " / " : ""}${owner?.name || item.mode_id}`, "ha-plus-detail-row"));
        }
        for (const [key, item] of Object.entries(this._data.values)) {
          const owner = this._data.modes.find((mode) => mode.id === item.mode_id);
          explain.append(el("div", `${key} \u2192 ${item.value} \xB7 ${owner?.group ? owner.group + " / " : ""}${owner?.name}`, "ha-plus-detail-row"));
        }
        if (!Object.keys(this._data.effects).length && !Object.keys(this._data.values).length) explain.append(el("p", "No settings are currently controlled by modes.", "ha-plus-muted"));
        main.append(explain);
        const history = el("details");
        history.append(el("summary", "Recent changes"));
        for (const item of this._data.history) history.append(el("p", `${item.mode} ${item.active ? "selected" : "cleared"} \xB7 ${when(item.at)}`, "ha-plus-muted"));
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
  };
  var ModesPlusPanel = class extends ModesView {
  };
  var ModesPlusCard = class extends ModesView {
    setConfig(config) {
      if (config.modes !== void 0 && (!Array.isArray(config.modes) || config.modes.some((value) => typeof value !== "string"))) throw new Error("modes must be a list of mode IDs");
      this._config = config;
      if (this._hass) this._render();
    }
    getCardSize() {
      return 5;
    }
    static getStubConfig() {
      return { title: "Home modes" };
    }
  };
  if (!customElements.get("modes-plus-panel")) customElements.define("modes-plus-panel", ModesPlusPanel);
  if (!customElements.get("modes-plus-card")) customElements.define("modes-plus-card", ModesPlusCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === "modes-plus-card")) window.customCards.push({ type: "modes-plus-card", name: "HA+ Modes", description: "Groups, household settings, and temporary overrides", preview: true });
})();
