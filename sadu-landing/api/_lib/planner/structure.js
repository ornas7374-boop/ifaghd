// sadu Planning Engine — the room's fixed structure, as Gemini reports it (structured JSON), with
// fallbacks built from the checked observations. The render template is filled from this; it never
// falls back to a generic prompt.
//   { room_type, door_position, window_position, existing_furniture[], furniture_zones[], ceiling_lights, floor_type }
const { positionWords } = require("./schema");

const clean = (v, n = 160) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const list = (v, n = 8) => (Array.isArray(v) ? v : []).map(x => clean(typeof x === "object" && x ? (x.item || x.name || x.zone || JSON.stringify(x)) : x, 80)).filter(Boolean).slice(0, n);

function where(o) { return `on the ${o.wall} wall, ${positionWords(o).replace(/^on the /, "").replace(/^in the /, "")}`; }

/** raw: Gemini's observations (may carry the structured keys); room: understandRoom() result. */
function roomStructure(raw = {}, room = {}) {
  const doors = room.doors || [], windows = room.windows || [], furniture = room.furniture || [];
  const door = clean(raw.door_position) || (doors.length ? doors.map(where).join("; ") : "no door visible in the photo");
  const win = clean(raw.window_position) || (windows.length ? windows.map(where).join("; ") : "no window visible in the photo");
  const existing = list(raw.existing_furniture);
  const zones = list(raw.furniture_zones);
  return {
    room_type: clean(raw.room_type, 60) || "room",
    door_position: door,
    window_position: win,
    existing_furniture: existing.length ? existing : furniture.map(f => `${f.type} ${where(f)}`),
    furniture_zones: zones.length ? zones : furniture.map(f => `${f.wall} wall: ${f.type}`),
    ceiling_lights: clean(raw.ceiling_lights) || ((room.light && room.light.artificial && room.light.artificial.length) ? room.light.artificial.join(", ") : "existing ceiling lights"),
    floor_type: clean(raw.floor_type) || (room.surfaces && room.surfaces.floor) || "existing floor"
  };
}

module.exports = { roomStructure };
