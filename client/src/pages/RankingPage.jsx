import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Table, Spinner, Alert, Card, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext.jsx';
import API from '../API.js';

const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank);

export default function RankingPage() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState(null); // [{ username, best }]
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    API.getRanking().then(setRanking).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!ranking) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <Card>
      <Card.Body>
        <Card.Title>🏆 Ranking — best score per player</Card.Title>
        {ranking.length === 0 ? (
          <p className="text-muted">No games have been played yet.</p>
        ) : (
          <Table striped bordered hover responsive className="mt-3">
            <thead>
              <tr><th style={{ width: 80 }}>Rank</th><th>Player</th><th style={{ width: 140 }}>Best score</th></tr>
            </thead>
            <tbody>
              {ranking.map((row, i) => (
                <tr key={row.username} className={row.username === user.username ? 'table-primary' : ''}>
                  <td>{medal(i + 1)}</td>
                  <td>{row.username}{row.username === user.username && ' (you)'}</td>
                  <td>{row.best}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Button as={Link} to="/" variant="outline-secondary">Back to Home</Button>
      </Card.Body>
    </Card>
  );
}
