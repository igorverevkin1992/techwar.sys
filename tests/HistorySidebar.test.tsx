import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import HistorySidebar from '../components/HistorySidebar';
import type { HistoryItem } from '../types';

const makeItem = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
  id: 1,
  created_at: '2025-01-01T10:00:00Z',
  topic: 'Test Topic',
  model: 'gemini-3-pro-preview',
  script: [],
  ...overrides,
});

const defaultItems: HistoryItem[] = [
  makeItem({ id: 1, topic: 'Alpha Project' }),
  makeItem({ id: 2, topic: 'Beta Research' }),
  makeItem({ id: 3, topic: 'Gamma Investigation' }),
];

describe('HistorySidebar (inline mode)', () => {
  it('renders all history items', () => {
    render(
      <HistorySidebar
        history={defaultItems}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        inline
      />
    );
    expect(screen.getByText('Alpha Project')).toBeTruthy();
    expect(screen.getByText('Beta Research')).toBeTruthy();
    expect(screen.getByText('Gamma Investigation')).toBeTruthy();
  });

  it('shows "NO PROJECTS SAVED" when history is empty', () => {
    render(
      <HistorySidebar
        history={[]}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        inline
      />
    );
    expect(screen.getByText('NO PROJECTS SAVED')).toBeTruthy();
  });

  it('calls onSelect when a project card is clicked', () => {
    const onSelect = vi.fn();
    render(
      <HistorySidebar
        history={defaultItems}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={onSelect}
        onDelete={vi.fn()}
        inline
      />
    );
    fireEvent.click(screen.getByText('Alpha Project'));
    expect(onSelect).toHaveBeenCalledWith(defaultItems[0]);
  });

  it('calls onDelete with item id and event when delete button is clicked', () => {
    const onDelete = vi.fn();
    const { container } = render(
      <HistorySidebar
        history={[makeItem({ id: 42, topic: 'Delete Me' })]}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onDelete={onDelete}
        inline
      />
    );
    // Delete button is a <button> inside the card
    const deleteBtn = container.querySelector('button[title="Delete Entry"]');
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn!);
    expect(onDelete).toHaveBeenCalledWith(42, expect.any(Object));
  });

  it('filters items by search query', () => {
    render(
      <HistorySidebar
        history={defaultItems}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        inline
      />
    );
    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'beta' } });
    expect(screen.getByText('Beta Research')).toBeTruthy();
    expect(screen.queryByText('Alpha Project')).toBeNull();
    expect(screen.queryByText('Gamma Investigation')).toBeNull();
  });

  it('shows "NO MATCHING PROJECTS" when search finds nothing', () => {
    render(
      <HistorySidebar
        history={defaultItems}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        inline
      />
    );
    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'zzznomatch' } });
    expect(screen.getByText('NO MATCHING PROJECTS')).toBeTruthy();
  });

  it('shows the item count in the header', () => {
    render(
      <HistorySidebar
        history={defaultItems}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        inline
      />
    );
    expect(screen.getByText(`Saved Projects (${defaultItems.length})`)).toBeTruthy();
  });

  it('displays block count for each item', () => {
    const itemWithBlocks: HistoryItem = makeItem({
      id: 5,
      topic: 'Multi-Block',
      script: [
        { timecode: '', visualCue: '', overlayFX: '', audioScript: 'a', russianScript: '', blockType: 'HOOK' },
        { timecode: '', visualCue: '', overlayFX: '', audioScript: 'b', russianScript: '', blockType: 'BODY' },
      ],
    });
    render(
      <HistorySidebar
        history={[itemWithBlocks]}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        inline
      />
    );
    expect(screen.getByText('2 Blocks')).toBeTruthy();
  });
});

describe('HistorySidebar (overlay mode)', () => {
  it('renders the sidebar panel when isOpen=true', () => {
    render(
      <HistorySidebar
        history={defaultItems}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <HistorySidebar
        history={defaultItems}
        isOpen={true}
        onClose={onClose}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    // The backdrop is the first fixed overlay div
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });
});
