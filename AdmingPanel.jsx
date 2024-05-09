import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import { Container, Row, Col, Nav, Navbar } from 'react-bootstrap';
import Dashboard from './Dashboard';
import Users from './Users';
import Products from './Products';

function AdminPanel() {
  return (
    <Router>
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand as={Link} to="/">Admin Panel</Navbar.Brand>
        <Nav className="mr-auto">
          <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
          <Nav.Link as={Link} to="/users">Users</Nav.Link>
          <Nav.Link as={Link} to="/products">Products</Nav.Link>
        </Nav>
      </Navbar>
      <Container fluid>
        <Row>
          <Col md={2} className="bg-light sidebar">
            <Nav className="flex-column">
              <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
              <Nav.Link as={Link} to="/users">Users</Nav.Link>
              <Nav.Link as={Link} to="/products">Products</Nav.Link>
            </Nav>
          </Col>
          <Col md={10} className="content">
            <Switch>
              <Route path="/dashboard">
                <Dashboard />
              </Route>
              <Route path="/users">
                <Users />
              </Route>
              <Route path="/products">
                <Products />
              </Route>
            </Switch>
          </Col>
        </Row>
      </Container>
    </Router>
  );
}

export default AdminPanel;
