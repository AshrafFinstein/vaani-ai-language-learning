import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { CourseSummaryDTO } from '@vaani/types';
import { CourseCatalog } from '@/features/courses/CourseCatalog';
import { renderWithProviders } from './test-utils';

const COURSES: CourseSummaryDTO[] = [
  {
    id: 'c1',
    slug: 'spanish-foundations',
    title: 'Spanish Foundations',
    description: 'Greetings and essentials.',
    languageCode: 'es',
    level: 'BEGINNER',
    coverEmoji: '🇪🇸',
    estimatedMinutes: 90,
    moduleCount: 2,
    lessonCount: 3,
    enrolled: true,
    progressPercent: 33,
  },
  {
    id: 'c2',
    slug: 'french-travel-basics',
    title: 'French Travel Basics',
    description: 'Travel phrases.',
    languageCode: 'fr',
    level: 'ELEMENTARY',
    coverEmoji: '🇫🇷',
    estimatedMinutes: 75,
    moduleCount: 2,
    lessonCount: 2,
    enrolled: false,
    progressPercent: 0,
  },
];

describe('CourseCatalog', () => {
  it('renders course cards linking to each course detail page', () => {
    renderWithProviders(<CourseCatalog courses={COURSES} />);

    expect(screen.getByText('Spanish Foundations')).toBeInTheDocument();
    expect(screen.getByText('French Travel Basics')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Open course Spanish Foundations' });
    expect(link).toHaveAttribute('href', '/app/courses/spanish-foundations');
  });

  it('shows progress only for enrolled courses', () => {
    renderWithProviders(<CourseCatalog courses={COURSES} />);
    expect(screen.getByText('33% complete')).toBeInTheDocument();
    expect(screen.queryByText('0% complete')).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no courses', () => {
    renderWithProviders(<CourseCatalog courses={[]} />);
    expect(screen.getByText(/No courses are available yet/i)).toBeInTheDocument();
  });

  it('shows skeletons while loading instead of cards', () => {
    renderWithProviders(<CourseCatalog courses={[]} isLoading />);
    expect(screen.queryByText('Spanish Foundations')).not.toBeInTheDocument();
  });
});
