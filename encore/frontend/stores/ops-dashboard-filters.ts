import { create } from 'zustand';

/**
 * Ephemeral filter state for ops dashboards (log/trace/metric filters,
 * selected time range, selected service). Purely a view concern — never a
 * source of truth for any ops metric value.
 */
export interface TimeRange {
  from: string | null; // ISO 8601
  to: string | null;
}

interface OpsDashboardFiltersState {
  service: string | null;
  level: string | null;
  timeRange: TimeRange;
  searchText: string;
  setService: (service: string | null) => void;
  setLevel: (level: string | null) => void;
  setTimeRange: (range: TimeRange) => void;
  setSearchText: (text: string) => void;
  reset: () => void;
}

const initial = {
  service: null,
  level: null,
  timeRange: { from: null, to: null } as TimeRange,
  searchText: '',
};

export const useOpsDashboardFiltersStore = create<OpsDashboardFiltersState>((set) => ({
  ...initial,
  setService: (service) => set({ service }),
  setLevel: (level) => set({ level }),
  setTimeRange: (timeRange) => set({ timeRange }),
  setSearchText: (searchText) => set({ searchText }),
  reset: () => set(initial),
}));
