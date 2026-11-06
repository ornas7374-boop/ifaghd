// Link health: re-check accepted images and mark dead URLs, so broken images never reach the generator.

const dbm = require("./db");
const image = require("./image");
const { mapLimit } = require("./http");

async function verifyLinks(db, { olderThanDays = 7, limit = 200, concurrency = 4, fetchImpl, log = () => {} } = {}) {
  const due = await dbm.dueForCheck(db, olderThanDays, limit);
  const out = { checked: due.length, alive: 0, broken: 0, unknown: 0 };
  await mapLimit(due, concurrency, async (row) => {
    const r = await image.checkAlive(row.image_url, { fetchImpl });
    if (r.alive === true) { out.alive++; await dbm.markChecked(db, row.id, r.status); }
    else if (r.alive === false) { out.broken++; await dbm.markBroken(db, row.id, r.status); log("warn", "link_broken", { id: row.id }); }
    else out.unknown++;   // transient failure: leave it for the next check
  });
  return out;
}

module.exports = { verifyLinks };
