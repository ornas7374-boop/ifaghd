// Relevance score (0..1) used to rank references. Rewards a confident room match, high image quality,
// resolution, a wide/medium shot that shows the room (not a detail), and a match with the search intent.

function resolutionScore(w, h) {
  const side = Math.min(w || 0, h || 0);
  return Math.max(0, Math.min(1, (side - 800) / 1700));   // 800px → 0, 2500px+ → 1
}

function relevance({ roomConfidence, quality, width, height, shot, room, queryRoom }) {
  const roomMatch = !queryRoom ? 1 : room === queryRoom ? 1 : 0.8;   // found by a different search term: still useful, slightly lower
  const shotScore = shot === "wide" ? 1 : shot === "medium" ? 0.85 : 0.5;
  const s = 0.35 * (roomConfidence ?? 0) * roomMatch + 0.35 * (quality ?? 0) + 0.15 * resolutionScore(width, height) + 0.15 * shotScore;
  return Math.round(Math.max(0, Math.min(1, s)) * 1000) / 1000;
}

module.exports = { relevance, resolutionScore };
