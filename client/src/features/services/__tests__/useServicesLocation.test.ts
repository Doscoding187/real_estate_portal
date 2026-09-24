import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useServicesLocation } from '../useServicesLocation';

describe('useServicesLocation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/services/home-improvement');
  });

  it('updates search state for same-path navigation', () => {
    const { result } = renderHook(() => useServicesLocation());

    act(() => {
      result.current.setLocation('/services/home-improvement?city=Cape+Town');
    });

    expect(result.current.search).toBe('?city=Cape+Town');
  });
});
