// Station coordinates are PURELY presentational, so they live here in the client as a
// layout config — the database only models the logical network (stations + segments).
// NOTE: if you rename a station in seed.js, rename its key here too.
const LAYOUT = {
  'Northgate': { x: 80, y: 110 },
  'Old Foundry': { x: 190, y: 130 },
  'Market Cross': { x: 310, y: 105 },
  'Riverside': { x: 430, y: 85 },
  'Cathedral Square': { x: 545, y: 120 },
  'Harbor End': { x: 250, y: 55 },
  'Clocktower': { x: 290, y: 255 },
  'Lantern Hill': { x: 470, y: 235 },
  'Greenfield': { x: 605, y: 280 },
  'Ironworks': { x: 345, y: 375 },
  'Crossroads': { x: 455, y: 390 },
  'Eastmoor': { x: 450, y: 480 },
  'Willowbrook': { x: 575, y: 455 },
  'Highpark': { x: 625, y: 400 },
  'Summit': { x: 600, y: 330 },
};

// Props:
//   stations       [{id, name}]
//   segments       [{station1_id, station2_id, line_id?}]
//   lineColors     { [lineId]: color }   (only needed when showBase is true)
//   startId, destId          highlighted stations (optional)
//   routeSegments  [{station1_id, station2_id}]  the player's selected route (highlighted)
//   showBase       draw all segments coloured by line (Setup); false hides them (Planning)
//   onStationClick (id) => void   makes stations clickable (Planning)
//   pendingId      the station awaiting a partner click (highlighted with a ring)
//   maxHeight      CSS max-height so the map fits on screen without scrolling
export default function NetworkMap({
  stations,
  segments = [],
  lineColors = {},
  startId,
  destId,
  routeSegments = [],
  showBase = false,
  onStationClick,
  pendingId,
  maxHeight = '62vh',
}) {
  const nameById = new Map(stations.map((s) => [s.id, s.name]));
  const pos = (id) => LAYOUT[nameById.get(id)];
  const colorOf = (id) =>
    id === startId ? '#198754' : id === destId ? '#dc3545' : '#6c757d';
  const clickable = typeof onStationClick === 'function';

  return (
    <svg
      viewBox="0 0 680 520"
      style={{ width: '100%', height: 'auto', maxHeight, display: 'block', margin: '0 auto' }}
    >
      {/* base network edges, coloured by line (Setup only) */}
      {showBase &&
        segments.map((seg) => {
          const a = pos(seg.station1_id);
          const b = pos(seg.station2_id);
          if (!a || !b) return null;
          return (
            <line
              key={`base-${seg.station1_id}-${seg.station2_id}-${seg.line_id}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={lineColors[seg.line_id] || '#adb5bd'}
              strokeWidth="4" strokeLinecap="round" opacity="0.85"
            />
          );
        })}

      {/* the player's selected route, highlighted on top (purple) */}
      {routeSegments.map((seg, i) => {
        const a = pos(seg.station1_id);
        const b = pos(seg.station2_id);
        if (!a || !b) return null;
        return (
          <line
            key={`route-${i}`}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="#6b5b95" strokeWidth="5" strokeLinecap="round"
          />
        );
      })}

      {/* stations (clickable in Planning) */}
      {stations.map((s) => {
        const p = pos(s.id);
        if (!p) return null;
        const isEnd = s.id === startId || s.id === destId;
        const isPending = s.id === pendingId;
        return (
          <g
            key={s.id}
            onClick={clickable ? () => onStationClick(s.id) : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
          >
            {/* larger invisible hit area makes the dots easy to click */}
            {clickable && <circle cx={p.x} cy={p.y} r="16" fill="transparent" />}
            {isPending && (
              <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#ffc107" strokeWidth="3" />
            )}
            <circle cx={p.x} cy={p.y} r={isEnd ? 8 : 6}
              fill={colorOf(s.id)} stroke="#fff" strokeWidth="1.5" />
            <text x={p.x} y={p.y + 19} textAnchor="middle"
              fontSize="13" fontWeight="600"
              fill="#212529" stroke="#fff" strokeWidth="3" paintOrder="stroke">{s.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
