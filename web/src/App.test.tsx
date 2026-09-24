import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders Dhaka Tesla Pool title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /Dhaka Tesla Pool/i })).toBeInTheDocument();
  });

  it('renders easy bike subtitle', () => {
    render(<App />);
    expect(screen.getByText(/Battery Rickshaw \(Easy-Bike\) Ride Sharing/i)).toBeInTheDocument();
  });
});
