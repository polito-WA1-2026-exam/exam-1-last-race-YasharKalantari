import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function NavHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Navbar className="navbar-purple" data-bs-theme="dark">
      <Container>
        <Navbar.Brand as={Link} to="/">🚇 Last Race</Navbar.Brand>
        <Nav className="ms-auto align-items-center">
          {user ? (
            <>
              <Nav.Link as={Link} to="/game">Play</Nav.Link>
              <Nav.Link as={Link} to="/ranking">Ranking</Nav.Link>
              <Navbar.Text className="mx-3">Hi, {user.username}</Navbar.Text>
              <Button variant="outline-light" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <Button variant="outline-light" size="sm" as={Link} to="/login">Login</Button>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
}
