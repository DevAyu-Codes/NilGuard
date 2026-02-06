import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom';

jest.mock('axios');

jest.mock('react-markdown', () => {
  return {
    __esModule: true,
    default: ({ children }) => <div data-testid="markdown-mock">{children}</div>,
  };
});

jest.mock('remark-gfm', () => {
  return {
    __esModule: true,
    default: () => {},
  };
});

test('renders the login screen by default', () => {
  render(<App />);
  
  const brandElements = screen.getAllByText(/NIL Guard/i);
  expect(brandElements.length).toBeGreaterThan(0);

  const usernameInput = screen.getByPlaceholderText(/Username/i);
  const passwordInput = screen.getByPlaceholderText(/Password/i);
  
  expect(usernameInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();
  
  const loginButton = screen.getByText(/Access Dashboard/i);
  expect(loginButton).toBeInTheDocument();
});