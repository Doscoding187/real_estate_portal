import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicAgentVideoPage } from '@shared/agentPublicVideo';

const { result, inputs, fetchNextPage, refetch } = vi.hoisted(() => ({
  result: { current: {} as any },
  inputs: [] as any[],
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/lib/trpc', () => ({
  trpc: {
    agent: {
      getPublicVideosForAgent: {
        useInfiniteQuery: (input: unknown, options: unknown) => {
          inputs.push({ input, options });
          return { ...result.current, fetchNextPage, refetch };
        },
      },
    },
  },
}));
import { AgentVideoSection } from './AgentVideoSection';

const video = (id: number) => ({
  id,
  title: `Sandton tour ${id}`,
  description: 'A published tour from this agent.',
  thumbnailUrl: '/properties/property-detail-preview-v1/hero-exterior.webp',
  videoUrl: `/media/tour-${id}.mp4`,
});
const mount = () => render(<AgentVideoSection slug="thabo-agent" agentName="Thabo" />);
const pages = (...values: PublicAgentVideoPage[]) => {
  result.current = { data: { pages: values }, hasNextPage: false, isError: false };
};

describe('agent-owned public video shelf', () => {
  beforeEach(() => {
    result.current = {};
    inputs.length = 0;
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it.each([
    { isLoading: true },
    { data: { pages: [{ items: [], nextCursor: null }] } },
    { isError: true },
  ])('omits unavailable or empty optional content: %j', state => {
    result.current = state;
    mount();
    expect(screen.queryByTestId('agent-videos-section')).toBeNull();
  });

  it('requests the exact profile slug and appears when public videos arrive', () => {
    const rendered = mount();
    expect(inputs[0].input).toEqual({ slug: 'thabo-agent', limit: 6 });
    expect(inputs[0].options.getNextPageParam({ nextCursor: 15 })).toBe(15);
    expect(inputs[0].options.getNextPageParam({ nextCursor: null })).toBeUndefined();
    pages({ items: [video(12)], nextCursor: null });
    rendered.rerender(<AgentVideoSection slug="thabo-agent" agentName="Thabo" />);
    expect(screen.getByRole('heading', { name: 'Videos from Thabo' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Watch Sandton tour 12' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Load more videos' })).toBeNull();
    expect(document.querySelector('video')).toBeNull();
  });

  it('opens the selected real media only on click, without autoplay, and removes it on close', () => {
    pages({ items: [video(12), video(11)], nextCursor: null });
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Watch Sandton tour 11' }));
    const player = document.querySelector('video')!;
    expect(player.getAttribute('src')).toBe('/media/tour-11.mp4');
    expect(player.getAttribute('preload')).toBe('none');
    expect(player.hasAttribute('controls')).toBe(true);
    expect(player.hasAttribute('autoplay')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(document.querySelector('video')).toBeNull();
  });

  it('deduplicates additional pages and retains current videos when loading more fails', () => {
    pages(
      { items: [video(9), video(8)], nextCursor: 8 },
      { items: [video(8), video(7)], nextCursor: 7 },
    );
    result.current.hasNextPage = true;
    const rendered = mount();
    expect(screen.getAllByRole('button', { name: /^Watch Sandton/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Load more videos' }));
    expect(fetchNextPage).toHaveBeenCalledOnce();
    result.current = { ...result.current, isError: true };
    rendered.rerender(<AgentVideoSection slug="thabo-agent" agentName="Thabo" />);
    expect(screen.getAllByRole('button', { name: /^Watch Sandton/ })).toHaveLength(3);
    expect(screen.getByRole('alert').textContent).toContain("More videos couldn't be loaded");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('offers a controlled retry if playback fails', () => {
    pages({ items: [video(12)], nextCursor: null });
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Watch Sandton tour 12' }));
    const original = document.querySelector('video')!;
    fireEvent.error(original);
    expect(screen.getByRole('alert').textContent).toContain("couldn't be played");
    fireEvent.click(screen.getByRole('button', { name: 'Retry video' }));
    expect(document.querySelector('video')).not.toBe(original);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
