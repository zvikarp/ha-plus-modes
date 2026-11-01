import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { parseHTML } from "linkedom";

async function setup(snapshot, fail = false) {
  const { window } = parseHTML("<html><body></body></html>");
  const context = vm.createContext({window, document:window.document, HTMLElement:window.HTMLElement, customElements:window.customElements, console});
  vm.runInContext(await readFile(new URL("../custom_components/modes_plus/frontend/modes-plus.js", import.meta.url), "utf8"), context);
  const calls = [];
  const hass = {
    states:{}, user:{is_admin:true},
    callWS:async () => structuredClone(snapshot),
    callService:async (...args) => { calls.push(args); if(fail) throw new Error("Device command rejected"); },
  };
  const panel = window.document.createElement("modes-plus-panel");
  window.document.body.append(panel); panel.hass = hass;
  await new Promise(resolve => setImmediate(resolve));
  return {window, panel, hass, calls};
}
function snapshot() {
  return {
    modes:[{id:"shabbat",name:"Shabbat",priority:50,group:"",effects:{"light.shelter":{state:"on",brightness:80}},values:{},active:{since:"2026-10-31T12:00:00Z",source:"automation",until:null}},{id:"alert",name:"Missile Alert",priority:100,group:"",effects:{"light.shelter":{state:"on",brightness:255}},values:{},active:null}],
    effects:{"light.shelter":{mode_id:"shabbat",desired:{state:"on",brightness:80}}},values:{},errors:{},history:[],
  };
}

test("overview explains active effects and activation sends the selected duration", async () => {
  const {panel,calls} = await setup(snapshot());
  assert.match([...panel.shadowRoot.children].map(node => node.textContent).join(" "),/Your home now/);
  assert.match([...panel.shadowRoot.children].map(node => node.textContent).join(" "),/Shabbat/);
  const select = panel.shadowRoot.querySelector("select");
  select.querySelector('option[value="120"]').selected = true;
  const activate = [...panel.shadowRoot.querySelectorAll("button")].find(node=>node.textContent==="Activate");
  activate.click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls[0][0],"modes_plus");
  assert.equal(calls[0][1],"activate");
  assert.equal(calls[0][2].mode_id,"alert");
  assert.equal(calls[0][2].duration,120);
});

test("failed actions remain visible after refreshing state", async () => {
  const {panel} = await setup(snapshot(),true);
  [...panel.shadowRoot.querySelectorAll("button")].find(node=>node.textContent==="End mode").click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(panel.shadowRoot.querySelector('[role="alert"]').textContent,/Device command rejected/);
  assert.equal([...panel.shadowRoot.querySelectorAll("button")].find(node=>node.textContent==="End mode").disabled,false);
});

test("mode names and device errors are rendered as text", async () => {
  const data=snapshot();data.modes[0].name='<img src=x onerror="alert(1)">';
  const {panel}=await setup(data);
  assert.equal(panel.shadowRoot.querySelector("img"),null);
  assert.match([...panel.shadowRoot.children].map(node => node.textContent).join(" "),/<img src=x/);
});

test("dashboard card filters modes and validates its configuration", async () => {
  const {window,hass}=await setup(snapshot());
  const card=window.document.createElement("modes-plus-card");
  assert.throws(()=>card.setConfig({modes:"alert"}),/list of mode IDs/);
  card.setConfig({modes:["alert"],title:"My modes"});window.document.body.append(card);card.hass=hass;
  await new Promise(resolve=>setImmediate(resolve));
  const headings=[...card.shadowRoot.querySelectorAll("h3")].map(node=>node.textContent);
  assert.deepEqual(headings,["Missile Alert"]);
  assert.match([...card.shadowRoot.children].map(node => node.textContent).join(" "),/My modes/);
});

test("load failures offer a retry and recover", async () => {
  const {panel,hass}=await setup(snapshot());
  const callWS=hass.callWS;hass.callWS=async()=>{throw new Error("Disconnected")};
  await panel._refresh();
  assert.match(panel.shadowRoot.querySelector('[role="alert"]').textContent,/Disconnected/);
  hass.callWS=callWS;await panel._refresh();
  assert.equal(panel.shadowRoot.querySelector('[role="alert"]'),null);
});


test("dashboard card surfaces partial device failures", async () => {
  const data=snapshot(); data.errors={"light.shelter":"Device unavailable"};
  const {window,hass}=await setup(data);
  const card=window.document.createElement("modes-plus-card");
  card.setConfig({});window.document.body.append(card);card.hass=hass;
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(card.shadowRoot.querySelector('[role="alert"]').textContent,/device actions need attention/);
  assert.equal(card.shadowRoot.querySelector('[role="alert"] a').getAttribute("href"),"/ha-plus-modes");
});
