import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('App component', () => {
  it('redirects to login page when not authenticated', () => {
    localStorage.removeItem('isAuthenticated');
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/Superadmin Login/i)).toBeInTheDocument();
  });

  it('renders dashboard when authenticated', () => {
    localStorage.setItem('isAuthenticated', 'true');
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Dashboard Overview/i, level: 1 })).toBeInTheDocument();
  });
});
