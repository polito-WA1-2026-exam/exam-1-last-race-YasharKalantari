import { useState, useRef, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, ListGroup, ProgressBar } from 'react-bootstrap';
import NetworkMap from './NetworkMap.jsx';

const PLANNING_SECONDS = 90;
const segKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

// Props: game = { start, destination, stations, segments }, onSubmit(route), onCancel()
export default function PlanningBoard({ game, onSubmit, onCancel }) {
  const { start, destination, stations, segments } = game;
  const nameById = new Map(stations.map((s) => [s.id, s.name]));

  // route: ordered, ORIENTED segments { station1_id: from, station2_id: to }.
  const [route, setRoute] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(PLANNING_SECONDS);

  // Submit exactly once (manual click OR timeout).
  const doneRef = useRef(false);
  const finishRef = useRef(() => {});
  useEffect(() => {
    finishRef.current = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onSubmit(route);
    };
  }, [route, onSubmit]);

  // Countdown: one self-cleaning timeout per tick (Strict-Mode safe).
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  // Auto-submit when time runs out (kept out of the state updater).
  useEffect(() => {
    if (secondsLeft === 0) finishRef.current();
  }, [secondsLeft]);

  // --- Continuous route building (the fix) ---
  // The route always starts at `start` and each new segment extends from the current
  // end, so the submitted array is ALWAYS an ordered chain start -> ... -> end. This
  // makes an out-of-order selection impossible to create in the first place.
  const currentEnd = route.length === 0 ? start.id : route[route.length - 1].station2_id;

  const usedKeys = new Set(route.map((r) => segKey(r.station1_id, r.station2_id)));
  const isUsed = (s) => usedKeys.has(segKey(s.station1_id, s.station2_id));
  // a segment is a valid NEXT step iff it touches the current end and is unused
  const isNext = (s) => !isUsed(s) && (s.station1_id === currentEnd || s.station2_id === currentEnd);

  const extend = (s) => {
    if (!isNext(s)) return;
    const to = s.station1_id === currentEnd ? s.station2_id : s.station1_id;
    setRoute([...route, { station1_id: currentEnd, station2_id: to }]); // store oriented
  };

  // Map click: extend to a station directly connected to the current end.
  const handleStationClick = (id) => {
    if (id === currentEnd) return;
    const seg = segments.find((s) => segKey(s.station1_id, s.station2_id) === segKey(currentEnd, id));
    if (seg) extend(seg);
  };

  const undo = () => setRoute(route.slice(0, -1));
  const clear = () => setRoute([]);

  const label = (seg) => {
    const names = [nameById.get(seg.station1_id), nameById.get(seg.station2_id)].sort();
    return `${names[0]} — ${names[1]}`;
  };
  const sortedSegments = [...segments].sort((x, y) => label(x).localeCompare(label(y)));
  const timerVariant = secondsLeft <= 15 ? 'danger' : undefined;
  const atDestination = route.length > 0 && currentEnd === destination.id;

  return (
    <Row>
      <Col md={5}>
        <div className="d-flex justify-content-between mb-2">
          <span><Badge bg="success">Start</Badge> {start.name}</span>
          <span><Badge bg="danger">Destination</Badge> {destination.name}</span>
        </div>

        <div className="d-flex justify-content-between small text-muted mb-1">
          <span>Time left: {secondsLeft}s</span>
          <Button variant="link" size="sm" className="p-0" onClick={onCancel}>Cancel game</Button>
        </div>
        <ProgressBar now={secondsLeft} max={PLANNING_SECONDS} variant={timerVariant} className="mb-3" />

        <Card className="mb-3">
          <Card.Header>Your route ({route.length} segments)</Card.Header>
          <Card.Body>
            {route.length === 0 ? (
              <span className="text-muted">
                Start at <strong>{start.name}</strong>: click a connected station on the map,
                or an active segment in the list.
              </span>
            ) : (
              route.map((seg, i) => (
                <Badge bg="primary" className="me-1 mb-1" key={`r-${i}`}>{label(seg)}</Badge>
              ))
            )}
            <div className="small mt-2">
              {atDestination ? (
                <span className="text-success">You're at the destination — submit, or keep extending.</span>
              ) : (
                <span className="text-muted">Currently at <strong>{nameById.get(currentEnd)}</strong>.</span>
              )}
            </div>
            <div className="mt-3">
              <Button variant="success" className="me-2" onClick={() => finishRef.current()}>Submit route</Button>
              <Button variant="outline-secondary" size="sm" className="me-2" onClick={undo} disabled={route.length === 0}>Undo</Button>
              <Button variant="outline-secondary" size="sm" onClick={clear} disabled={route.length === 0}>Clear</Button>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            All segments <span className="text-muted small">— active ones continue from {nameById.get(currentEnd)}</span>
          </Card.Header>
          <ListGroup variant="flush" style={{ maxHeight: 240, overflowY: 'auto' }}>
            {sortedSegments.map((seg) => (
              <ListGroup.Item
                action
                key={segKey(seg.station1_id, seg.station2_id)}
                disabled={!isNext(seg)}
                onClick={() => extend(seg)}
              >
                {label(seg)}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      </Col>

      <Col md={7}>
        <NetworkMap
          stations={stations}
          startId={start.id}
          destId={destination.id}
          routeSegments={route}
          onStationClick={handleStationClick}
          pendingId={currentEnd}
        />
        <p className="text-muted small text-center mb-0">
          The lines are hidden — click stations connected to your current position to extend the route.
        </p>
      </Col>
    </Row>
  );
}
