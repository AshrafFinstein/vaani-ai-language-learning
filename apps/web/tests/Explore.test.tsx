import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { ExplorePayloadDTO } from '@vaani/types';
import ExplorePage from '@/pages/app/Explore';
import { renderWithProviders } from './test-utils';

const PAYLOAD: ExplorePayloadDTO = {
  date: '2026-09-22',
  intro: 'Fresh picks to keep your streak going.',
  highlight: {
    kind: 'ROLEPLAY',
    refKey: 'restaurant',
    title: 'Ordering at a restaurant',
    subtitle: 'Order a meal and handle the bill.',
    emoji: '🎭',
    to: '/app/roleplay/restaurant',
  },
  sections: [
    {
      key: 'scenarios',
      title: "Today's scenarios",
      picks: [
        {
          kind: 'ROLEPLAY',
          refKey: 'airport',
          title: 'At the airport',
          subtitle: 'Check in for a flight.',
          emoji: '🎭',
          to: '/app/roleplay/airport',
        },
      ],
    },
    {
      key: 'characters',
      title: 'Featured characters',
      picks: [
        {
          kind: 'CHARACTER',
          refKey: 'barista',
          title: 'Mika the Barista',
          subtitle: 'a cheerful barista',
          emoji: '☕',
          to: '/app/characters/barista',
        },
      ],
    },
  ],
};

vi.mock('@/features/explore/useExplore', () => ({
  useExplore: () => ({ data: PAYLOAD, isLoading: false }),
}));

describe('ExplorePage', () => {
  it('renders the daily-pick hero and sections linking into the modes', () => {
    renderWithProviders(<ExplorePage />);

    // Hero highlight.
    expect(screen.getByText('Pick of the day')).toBeInTheDocument();
    const hero = screen.getByRole('link', { name: /featured: ordering at a restaurant/i });
    expect(hero).toHaveAttribute('href', '/app/roleplay/restaurant');

    // Section titles.
    expect(screen.getByText("Today's scenarios")).toBeInTheDocument();
    expect(screen.getByText('Featured characters')).toBeInTheDocument();

    // A section pick links into its mode route.
    const characterLink = screen.getByRole('link', { name: 'Open Mika the Barista' });
    expect(characterLink).toHaveAttribute('href', '/app/characters/barista');
  });
});
