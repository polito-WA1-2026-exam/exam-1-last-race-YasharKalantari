import { useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Controlled inputs: React state is the single source of truth for the fields.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault(); // stop the browser's default full-page form submit
    setError('');
    try {
      await login({ username, password });
      navigate('/'); // success: go back to the home page
    } catch (err) {
      setError(err.message); // show the server's "wrong username or password" message
    }
  };

  return (
    <Card style={{ maxWidth: 400, margin: '2rem auto' }}>
      <Card.Body>
        <Card.Title className="mb-3">Login</Card.Title>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="username">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Button type="submit" className="me-2">Login</Button>
          <Button as={Link} to="/" variant="outline-secondary">Back to Home</Button>
        </Form>
        <small className="text-muted d-block mt-3">
          Test accounts: alice / alicepass, bob / bobpass, carol / carolpass
        </small>
      </Card.Body>
    </Card>
  );
}
