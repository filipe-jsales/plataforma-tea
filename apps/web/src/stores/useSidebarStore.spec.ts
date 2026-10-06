import { beforeEach, describe, expect, it } from 'vitest';
import { useSidebarStore } from './useSidebarStore';

beforeEach(() => {
  useSidebarStore.setState({ collapsed: false });
});

describe('useSidebarStore', () => {
  it('starts expanded', () => {
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('toggleCollapsed alternates between expanded and compact', () => {
    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().collapsed).toBe(true);
    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('setCollapsed sets the state explicitly', () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });
});
