import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Button, Spinner, Alert, Card, Badge } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext.jsx';
import API from '../API.js';
import NetworkMap from '../components/NetworkMap.jsx';
import PlanningBoard from '../components/PlanningBoard.jsx';
import ExecutionView from '../components/ExecutionView.jsx';

export default function GamePage() {
  const { user } = useAuth();

  // Phases of one game: setup -> planning -> submitting -> execution (valid) | result (invalid).
  const [phase, setPhase] = useState('setup');
  const [network, setNetwork] = useState(null); // { stations, lines, segments }
  const [game, setGame] = useState(null);        // planning data from the server
  const [result, setResult] = useState(null);    // { valid, steps, finalScore, reason }
  const [error, setError] = useState('');

  // Load the full network once for the Setup map. Gated on `user` so an anonymous
  // visitor hitting /game does not fire a doomed request before being redirected.
  useEffect(() => {
    if (!user) return;
    API.getNetwork().then(setNetwork).catch((e) => setError(e.message));
  }, [user]);

  const lineColors = useMemo(() => {
    const m = {};
    if (network) for (const l of network.lines) m[l.id] = l.color;
    return m;
  }, [network]);

  const startPlanning = async () => {
    setError('');
    try {
      const data = await API.startGame();
      setGame(data);
      setPhase('planning');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSubmit = useCallback(async (route) => {
    setPhase('submitting');
    try {
      const payload = route.map((s) => ({ station1_id: s.station1_id, station2_id: s.station2_id }));
      const res = await API.submitRoute(payload);
      setResult(res);
      setPhase(res.valid ? 'execution' : 'result');
    } catch (e) {
      setError(e.message);
      setPhase('setup');
    }
  }, []);

  const backToSetup = () => { setResult(null); setGame(null); setPhase('setup'); };

  const HomeButton = () => (
    <Button as={Link} to="/" variant="outline-secondary">Back to Home</Button>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!network) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  if (phase === 'planning') {
    return <PlanningBoard game={game} onSubmit={handleSubmit} onCancel={backToSetup} />;
  }

  if (phase === 'submitting') {
    return <div className="text-center mt-5"><Spinner animation="border" /><p>Scoring your route…</p></div>;
  }

  if (phase === 'execution') {
    return <ExecutionView steps={result.steps} finalScore={result.finalScore} onPlayAgain={backToSetup} />;
  }

  if (phase === 'result') {
    // Reached only for invalid/incomplete routes: execution is skipped, score is 0.
    return (
      <Card>
        <Card.Body>
          <Alert variant="danger">Invalid route: {result.reason} — your score is 0.</Alert>
          <Button className="me-2" onClick={backToSetup}>Play again</Button>
          <HomeButton />
        </Card.Body>
      </Card>
    );
  }

  // phase === 'setup': show the full map with all lines.
  return (
    <Card>
      <Card.Body>
        <Card.Title>Setup — study the network</Card.Title>
        <div className="mb-2">
          {network.lines.map((l) => (
            <Badge key={l.id} className="me-2" style={{ backgroundColor: l.color }}>{l.name}</Badge>
          ))}
        </div>
        <NetworkMap
          stations={network.stations}
          segments={network.segments}
          lineColors={lineColors}
          showBase
        />
        <div className="mt-2">
          <Button className="me-2" onClick={startPlanning}>Start planning</Button>
          <HomeButton />
        </div>
      </Card.Body>
    </Card>
  );
}
