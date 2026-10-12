import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

const DISTINCTIVE_ERROR = 'ERR_BOUNDARY_REGRESSION_7f3a9c1_distinctive_payload';

function Bomb() {
  throw new Error(DISTINCTIVE_ERROR);
}

describe('ErrorBoundary consumer fallback regression', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let reloadSpy: ReturnType<typeof vi.fn>;
  let assignSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reloadSpy = vi.fn();
    assignSpy = vi.fn();
    vi.stubGlobal('location', { reload: reloadSpy, assign: assignSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders friendly fallback copy without raw error details', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/try reloading, or return to the homepage/i)).toBeInTheDocument();

    expect(screen.queryByText(new RegExp(DISTINCTIVE_ERROR))).not.toBeInTheDocument();
    expect(document.querySelector('pre')).not.toBeInTheDocument();
  });

  it('triggers a page reload from the Reload action', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload Page' }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('returns to the homepage from the Home action', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to Homepage' }));
    expect(assignSpy).toHaveBeenCalledWith('/');
  });

  it('preserves diagnostic logging with the original error', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    const boundaryCalls = consoleErrorSpy.mock.calls.filter(call =>
      String(call[0]).includes('[ErrorBoundary]'),
    );
    expect(boundaryCalls.length).toBeGreaterThan(0);
    expect((boundaryCalls[0][1] as Error).message).toBe(DISTINCTIVE_ERROR);
  });
});
