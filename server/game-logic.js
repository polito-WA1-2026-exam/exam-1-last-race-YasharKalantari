// Pure game logic — no database, no Express. Everything here is just functions on
// plain data, which makes it easy to reason about and to test. Route validation and
// scoring will be added to this same file in the next step.

const MIN_DISTANCE = 3; // start and destination must be at least 3 segments apart

// Build an UNDIRECTED adjacency list from the segments: station id -> [neighbour ids].
function buildAdjacency(segments) {
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  };
  for (const s of segments) {
    link(s.station1_id, s.station2_id);
    link(s.station2_id, s.station1_id);
  }
  return adj;
}

// Breadth-first search from one station: returns a Map of station id -> shortest
// distance (number of segments). BFS visits nodes in order of increasing distance,
// so the first time it reaches a station is guaranteed to be by a shortest path.
function bfsDistances(startId, adj) {
  const dist = new Map([[startId, 0]]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of adj.get(current) || []) {
      if (!dist.has(next)) {
        dist.set(next, dist.get(current) + 1);
        queue.push(next);
      }
    }
  }
  return dist;
}

// Pick a random start station, then a random destination whose shortest-path
// distance from it is >= MIN_DISTANCE. Stations are tried in random order so the
// choice is varied, and the loop keeps the function correct for ANY network shape.
export function pickStartAndDestination(stations, segments) {
  const adj = buildAdjacency(segments);
  const ids = stations.map((s) => s.id);

  // Fisher–Yates shuffle for an unbiased random order of candidate starts.
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  for (const startId of ids) {
    const dist = bfsDistances(startId, adj);
    const candidates = [];
    for (const [id, d] of dist) {
      if (d >= MIN_DISTANCE) candidates.push(id);
    }
    if (candidates.length > 0) {
      const destId = candidates[Math.floor(Math.random() * candidates.length)];
      return { startId, destId };
    }
  }
  throw new Error('No start/destination pair with the required minimum distance exists.');
}

// Turn the full segments into the list shown during Planning: undirected station
// pairs with NO line information, and each pair listed only once. Hiding the line is
// the whole point of the game — the player must reconstruct the network themselves.
export function toPlanningSegments(segments) {
  const seen = new Set();
  const result = [];
  for (const s of segments) {
    const a = Math.min(s.station1_id, s.station2_id);
    const b = Math.max(s.station1_id, s.station2_id);
    const key = `${a}-${b}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ station1_id: a, station2_id: b });
    }
  }
  return result;
}

// ---- Route submission: validation, then execution/scoring ----

const START_COINS = 20;

// Validate a submitted route against the network and the assigned start/destination.
// `route` is the ordered list of selected segments: [{ station1_id, station2_id }, ...].
// Returns { valid: true, path:[stationId,...] } or { valid: false, reason }.
export function validateRoute(route, startId, destId, networkSegments) {
  const pairKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

  // Build lookups from the REAL network: which line(s) each connection / station has.
  const pairLines = new Map();     // "a-b" -> Set(line ids)
  const stationLines = new Map();  // station id -> Set(line ids)
  const addStationLine = (st, line) => {
    if (!stationLines.has(st)) stationLines.set(st, new Set());
    stationLines.get(st).add(line);
  };
  for (const s of networkSegments) {
    const k = pairKey(s.station1_id, s.station2_id);
    if (!pairLines.has(k)) pairLines.set(k, new Set());
    pairLines.get(k).add(s.line_id);
    addStationLine(s.station1_id, s.line_id);
    addStationLine(s.station2_id, s.line_id);
  }
  const isInterchange = (st) => (stationLines.get(st)?.size || 0) > 1;

  // (1) The route must be a non-empty list.
  if (!Array.isArray(route) || route.length === 0) {
    return { valid: false, reason: 'The route is empty or incomplete.' };
  }

  // (2) Every selected segment must be a REAL connection, and used at most once.
  const usedPairs = new Set();
  for (const seg of route) {
    const a = Number(seg?.station1_id);
    const b = Number(seg?.station2_id);
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      return { valid: false, reason: 'A selected segment is malformed.' };
    }
    const k = pairKey(a, b);
    if (!pairLines.has(k)) return { valid: false, reason: 'A selected segment does not exist in the network.' };
    if (usedPairs.has(k)) return { valid: false, reason: 'A segment was used more than once.' };
    usedPairs.add(k);
  }

  // (3) Walk the route to check connectivity and the endpoints, building the station path.
  const path = [startId];
  let current = startId;
  for (const seg of route) {
    const a = Number(seg.station1_id);
    const b = Number(seg.station2_id);
    let next;
    if (a === current) next = b;
    else if (b === current) next = a;
    else return { valid: false, reason: 'The route is not connected (a segment does not continue from the previous one).' };
    current = next;
    path.push(current);
  }
  if (current !== destId) {
    return { valid: false, reason: 'The route does not end at the assigned destination.' };
  }

  // (4) Line-change rule: a change of line may happen only at an interchange station.
  // Track the set of lines the current run could be on.
  //  - at an interchange you MAY change, so the next segment can be on ANY of its lines;
  //  - at a non-interchange you may NOT change, so the next segment must stay on a line
  //    the run is already on (a non-empty intersection); otherwise the route is invalid.
  let currentLines = new Set(pairLines.get(pairKey(Number(route[0].station1_id), Number(route[0].station2_id))));
  for (let i = 1; i < route.length; i++) {
    const k = pairKey(Number(route[i].station1_id), Number(route[i].station2_id));
    const segLines = pairLines.get(k);
    const junction = path[i]; // the station between segment i-1 and segment i
    if (isInterchange(junction)) {
      currentLines = new Set(segLines); // change allowed: segment i may be on any of its lines
    } else {
      const intersection = new Set([...currentLines].filter((l) => segLines.has(l)));
      if (intersection.size === 0) {
        return { valid: false, reason: 'A line change occurred at a station that is not an interchange.' };
      }
      currentLines = intersection;
    }
  }

  return { valid: true, path };
}

// Execute a validated route: for each step pick a random event and apply its coin
// effect. Returns the per-step results and the final score. The running total may go
// negative and is shown as-is; only the FINAL score is clamped to a minimum of 0.
export function executeRoute(path, events) {
  let coins = START_COINS;
  const steps = [];
  for (let i = 0; i < path.length - 1; i++) {
    const event = events[Math.floor(Math.random() * events.length)];
    coins += event.effect;
    steps.push({
      fromId: path[i],
      toId: path[i + 1],
      event: { description: event.description, effect: event.effect },
      coins,
    });
  }
  return { steps, finalScore: Math.max(0, coins) };
}
