import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { parseHTML } from "linkedom";

const tick = () => new Promise(resolve => setImmediate(resolve));
const text = node => [...node.children].map(child => child.textContent).join(" ");
async function setup(snapshot, fail = false) {
  const { window } = parseHTML("<html><body></body></html>");
  const context = vm.createContext({ window, document: window.document, HTMLElement: window.HTMLElement, customElements: window.customElements, console });
  vm.runInContext(await readFile(new URL("../custom_components/modes_plus/frontend/modes-plus.js", import.meta.url), "utf8"), context);
  const calls = [], wsCalls = [];
  const hass = {
    states: {}, user: { is_admin: true },
    callWS: async message => {
      wsCalls.push(message);
      if (message.type === "modes_plus/create_group") {
        snapshot.groups.push(message.name);
        return { name: message.name };
      }
      return structuredClone(snapshot);
    },
    callService: async (...args) => { calls.push(args); if (fail) throw new Error("Device command rejected"); },
  };
  const panel = window.document.createElement("modes-plus-panel");
  window.document.body.append(panel);
  panel.hass = hass;
  await tick();
  return { window, panel, hass, calls, wsCalls };
}
function snapshot() {
  const mode = (id, name, group, priority, active = null) => ({ id, name, group, priority, effects: {}, values: {}, active });
  const active = { since: "2026-10-31T12:00:00Z", source: "automation", until: null };
  return {
    groups: ["Calendar", "Presence", "Safety"],
    modes: [mode("shabbat", "Shabbat", "Calendar", 50, active), mode("home", "Home", "Presence", 10, active), mode("away", "Away", "Presence", 10), mode("alert", "Missile Alert", "Safety", 100)],
    effects: {}, values: {}, errors: {}, history: [],
  };
}
function choose(panel, control, label) {
  const trigger = panel.shadowRoot.querySelector(`[data-control="${control}"]`);
  trigger.click();
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  const option = [...trigger.parentElement.querySelectorAll('[role="option"]')].find(node => node.textContent === label);
  assert.ok(option, `Missing ${control} option: ${label}`);
  option.click();
}
function apply(panel) {
  [...panel.shadowRoot.querySelectorAll("button")].find(node => node.textContent === "Apply").click();
}

test("select group, mode, duration; apply one request with no separate toggles", async () => {
  const { panel, calls } = await setup(snapshot());
  assert.match(text(panel.shadowRoot), /Your groups/);
  assert.equal(panel.shadowRoot.querySelector("select"), null);
  assert.equal(panel.shadowRoot.querySelector('[role="switch"]'), null);
  choose(panel, "group", "Safety");
  choose(panel, "mode", "Missile Alert");
  choose(panel, "duration", "2 hours");
  apply(panel);
  await tick();
  assert.equal(calls[0][0], "modes_plus");
  assert.equal(calls[0][1], "select");
  assert.equal(calls[0][2].group, "Safety");
  assert.equal(calls[0][2].mode_id, "alert");
  assert.equal(calls[0][2].duration, 120);
});

test("group heading connects active setting to inactive chips; None clears group", async () => {
  const { panel, calls } = await setup(snapshot());
  const presence = [...panel.shadowRoot.querySelectorAll(".group")].find(card => card.querySelector("h3").textContent === "Presence");
  assert.equal(presence.querySelector(".group-state").textContent, "Home");
  assert.equal(presence.querySelector('.chip[aria-label="Away: inactive"]').textContent, "Away");
  choose(panel, "group", "Presence");
  choose(panel, "mode", "None · normal behavior");
  apply(panel);
  await tick();
  assert.equal(calls[0][2].group, "Presence");
  assert.equal(calls[0][2].mode_id, "");
});

test("custom dropdown supports keyboard open/escape and refresh is icon-only", async () => {
  const { window, panel } = await setup(snapshot());
  const trigger = panel.shadowRoot.querySelector('[data-control="group"]');
  const event = new window.Event("keydown", { bubbles: true, cancelable: true });
  event.key = "ArrowDown";
  trigger.dispatchEvent(event);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  const escape = new window.Event("keydown", { bubbles: true });
  escape.key = "Escape";
  trigger.dispatchEvent(escape);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  const refresh = panel.shadowRoot.querySelector('[aria-label="Refresh"]');
  assert.equal(refresh.textContent, "");
  assert.equal(refresh.querySelector("ha-icon").getAttribute("icon"), "mdi:refresh");
});

test("failed actions remain visible after refreshing state", async () => {
  const { panel } = await setup(snapshot(), true);
  apply(panel);
  await tick();
  assert.match(panel.shadowRoot.querySelector('[role="alert"]').textContent, /Device command rejected/);
  assert.equal([...panel.shadowRoot.querySelectorAll("button")].find(node => node.textContent === "Apply").disabled, false);
});

test("mode and group names are text, never HTML", async () => {
  const data = snapshot();
  data.modes[0].name = '<img src=x onerror="alert(1)">';
  const { panel } = await setup(data);
  assert.equal(panel.shadowRoot.querySelector("main img"), null);
  assert.match(text(panel.shadowRoot), /<img src=x/);
});

test("card filters include the whole exclusive group so active settings stay visible", async () => {
  const { window, hass } = await setup(snapshot());
  const card = window.document.createElement("modes-plus-card");
  assert.throws(() => card.setConfig({ modes: "alert" }), /list of mode IDs/);
  card.setConfig({ modes: ["away"], title: "My modes" });
  window.document.body.append(card);
  card.hass = hass;
  await tick();
  assert.deepEqual([...card.shadowRoot.querySelectorAll("h3")].map(node => node.textContent), ["Presence"]);
  assert.match(text(card.shadowRoot), /Home/);
  assert.match(text(card.shadowRoot), /Away/);
  assert.doesNotMatch(text(card.shadowRoot), /Shabbat/);
});

test("load failures recover and device failures remain visible in the card", async () => {
  const data = snapshot();
  const { panel, hass, window } = await setup(data);
  const callWS = hass.callWS;
  hass.callWS = async () => { throw new Error("Disconnected"); };
  await panel._refresh();
  assert.match(panel.shadowRoot.querySelector('[role="alert"]').textContent, /Disconnected/);
  hass.callWS = callWS;
  await panel._refresh();
  assert.equal(panel.shadowRoot.querySelector('[role="alert"]'), null);
  data.errors = { "light.shelter": "Device unavailable" };
  const card = window.document.createElement("modes-plus-card");
  card.setConfig({});
  window.document.body.append(card);
  card.hass = hass;
  await tick();
  assert.match(card.shadowRoot.querySelector('[role="alert"]').textContent, /device actions need attention/);
});

test("legacy independent modes keep distinct selectors and send a scoped identity", async () => {
  const data = snapshot();
  data.modes.forEach(mode => { mode.group = ""; });
  data.groups = [];
  const { panel, calls } = await setup(data);
  choose(panel, "group", "Missile Alert");
  choose(panel, "mode", "Missile Alert");
  apply(panel);
  await tick();
  assert.equal(calls[0][2].group, "");
  assert.equal(calls[0][2].standalone_mode_id, "alert");
});

test("group creation is offered to admins and keeps empty groups selectable", async () => {
  const { panel, wsCalls } = await setup(snapshot());
  const form = panel.shadowRoot.querySelector(".create-group form");
  form.querySelector("input").value = "Daily rhythm";
  form.dispatchEvent(new panel.ownerDocument.defaultView.Event("submit", { cancelable: true }));
  await tick();
  assert.ok(wsCalls.some(message => message.type === "modes_plus/create_group" && message.name === "Daily rhythm"));
  assert.match(text(panel.shadowRoot), /No modes yet/);
  assert.equal(panel.shadowRoot.querySelector('[data-control="mode"]').disabled, true);
});

test("registered monochrome logo matches the supplied SVG asset", async () => {
  const { window } = await setup(snapshot());
  const icon = await window.customIcons["modes-plus"].getIcon("logo");
  const svg = await readFile(new URL("../custom_components/modes_plus/brand/icon-monochrome.svg", import.meta.url), "utf8");
  assert.equal(icon.viewBox, "0 0 513 512");
  assert.ok(svg.includes(`d="${icon.path}"`));
});

test("panel and compact card use only the shared app stylesheet", async () => {
  const { appStyles } = await import("@ha-plus/ui");
  const { window, panel, hass } = await setup(snapshot());
  const card = window.document.createElement("modes-plus-card");
  window.document.body.append(card);
  card.hass = hass;
  await tick();
  for (const view of [panel, card]) {
    assert.equal([...view.shadowRoot.children].filter(node => node.localName === "style").length, 1);
    assert.equal(view.shadowRoot.querySelector("style").textContent, appStyles);
    assert.equal(view.shadowRoot.querySelector("[style]"), null);
    assert.ok(view.shadowRoot.querySelector(".ha-plus-form-grid"));
    assert.ok(view.shadowRoot.querySelector(".ha-plus-card-grid"));
  }
});

test("group drafts survive refresh and narrow-layout changes", async () => {
  const { panel, window } = await setup(snapshot());
  const input = panel.shadowRoot.querySelector('[name="group_name"]');
  input.value = "Quiet evenings";
  input.dispatchEvent(new window.Event("input"));
  const details = input.closest("details");
  details.open = true;
  details.dispatchEvent(new window.Event("toggle"));
  panel.narrow = true;
  assert.equal(panel.shadowRoot.querySelector('[name="group_name"]'), input);
  await panel._refresh();
  assert.equal(panel.shadowRoot.querySelector('[name="group_name"]').value, "Quiet evenings");
  assert.equal(panel.shadowRoot.querySelector('.create-group').open, true);
});
