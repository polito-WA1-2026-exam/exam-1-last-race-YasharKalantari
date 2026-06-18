import { Card, Button, Row, Col, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const FEATURES = [
  { icon: '🗺️', title: 'Plan the route', text: 'Rebuild the hidden metro map from a list of segments and chart a path.' },
  { icon: '⏱️', title: '90 seconds', text: 'The clock starts in the planning phase — submit before it runs out.' },
  { icon: '🪙', title: 'Collect coins', text: 'Start with 20 coins; random events on each leg add or remove a few.' },
  { icon: '🔀', title: 'Mind the lines', text: 'Change lines only at interchanges, and never reuse a segment.' },
];

const STEPS = [
  { n: 1, title: 'Setup', text: 'Study the full network with every line shown.' },
  { n: 2, title: 'Planning', text: 'Lines hidden — build your route against the clock.' },
  { n: 3, title: 'Execution', text: 'Watch each leg play out and the coins change.' },
  { n: 4, title: 'Result', text: 'See your final score and climb the ranking.' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <Container className="px-0">
      <Card className="mb-4 border-0 shadow-sm text-white app-hero">
        <Card.Body className="text-center py-5">
          <h1 className="display-5 fw-bold mb-2">Last Race</h1>
          <p className="lead mb-4">Plan a metro route, beat the clock, and finish with the most coins.</p>
          {user ? (
            <Button size="lg" variant="light" as={Link} to="/game">▶ Play now</Button>
          ) : (
            <Button size="lg" variant="light" as={Link} to="/login">Log in to play</Button>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3 mb-4">
        {FEATURES.map((f) => (
          <Col md={3} sm={6} key={f.title}>
            <Card className="h-100 text-center shadow-sm">
              <Card.Body>
                <div style={{ fontSize: '2.2rem' }}>{f.icon}</div>
                <Card.Title className="h6 mt-2">{f.title}</Card.Title>
                <Card.Text className="small text-muted">{f.text}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title className="h5 mb-3">How a round works</Card.Title>
          <Row className="g-3">
            {STEPS.map((s) => (
              <Col md={3} sm={6} key={s.n}>
                <div className="d-flex align-items-start">
                  <span className="badge rounded-pill bg-primary me-2">{s.n}</span>
                  <div>
                    <div className="fw-semibold">{s.title}</div>
                    <div className="small text-muted">{s.text}</div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
          {!user && (
            <p className="text-muted mt-3 mb-0">
              Anonymous visitors can read these instructions; logging in unlocks the map and play.
            </p>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
