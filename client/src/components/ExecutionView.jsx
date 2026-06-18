import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, ListGroup, Badge, Button, Alert, ProgressBar } from 'react-bootstrap';

const START_COINS = 20;
const STEP_DELAY = 1000; // ms between revealed steps

// Props: steps [{from, to, event:{description, effect}, coins}], finalScore, onPlayAgain
export default function ExecutionView({ steps, finalScore, onPlayAgain }) {
  const [revealed, setRevealed] = useState(0); // how many steps are shown so far

  // Reveal one more step each second, until all are shown. setTimeout with cleanup,
  // so Strict Mode's double mount leaves only one pending timer.
  useEffect(() => {
    if (revealed >= steps.length) return undefined;
    const id = setTimeout(() => setRevealed((r) => r + 1), STEP_DELAY);
    return () => clearTimeout(id);
  }, [revealed, steps.length]);

  const done = revealed >= steps.length;
  // Running total (may go negative mid-journey); before any step it is the starting 20.
  const coins = revealed === 0 ? START_COINS : steps[revealed - 1].coins;

  return (
    <Card>
      <Card.Body>
        <Card.Title>Execution</Card.Title>
        <h3 className="mb-2">🪙 {coins} coins</h3>
        <ProgressBar
          now={revealed} max={steps.length || 1}
          label={`${revealed}/${steps.length}`} className="mb-3"
        />

        <ListGroup variant="flush" className="mb-3">
          {steps.slice(0, revealed).map((st, i) => (
            <ListGroup.Item key={i} className="d-flex justify-content-between">
              <span>{st.from} → {st.to}: {st.event.description}</span>
              <span>
                <Badge bg={st.event.effect >= 0 ? 'success' : 'danger'} className="me-2">
                  {st.event.effect >= 0 ? `+${st.event.effect}` : st.event.effect}
                </Badge>
                {st.coins} coins
              </span>
            </ListGroup.Item>
          ))}
        </ListGroup>

        {done && (
          <>
            <Alert variant="success">
              You reached the destination! Final score: <strong>{finalScore}</strong> coins.
            </Alert>
            <Button className="me-2" onClick={onPlayAgain}>Play again</Button>
            <Button as={Link} to="/" variant="outline-secondary">Back to Home</Button>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
