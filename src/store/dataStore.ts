import { create } from 'zustand';
import { db, ITicket } from '@/lib/db';

interface IFilterValues {
  startMonth: string | null;
  endMonth: string | null;
  year: string | null;
}

interface DataStoreState {
  allTickets: ITicket[];
  isLoading: boolean;
  filters: Record<string, IFilterValues>;
  initialize: () => Promise<void>;
  setFilter: (page: string, newFilter: IFilterValues) => void;
  getFilteredTickets: (page: string) => ITicket[];
}

const useDataStore = create<DataStoreState>((set, get) => ({
  allTickets: [],
  isLoading: true,
  filters: {},

  initialize: async () => {
    try {
      const tickets = await db.tickets.toArray();
      set({ allTickets: tickets, isLoading: false });
    } catch (error) {
      console.error("Failed to load tickets from DB", error);
      set({ isLoading: false });
    }
  },

  setFilter: (page, newFilter) => {
    // Logic to handle single month selection
    if (newFilter.startMonth && !newFilter.endMonth) {
      newFilter.endMonth = newFilter.startMonth;
    }
    set(state => ({
      filters: {
        ...state.filters,
        [page]: newFilter,
      },
    }));
  },
  
  getFilteredTickets: (page: string) => {
    const { allTickets, filters } = get();
    const filter = filters[page];

    if (!filter || !filter.startMonth || !filter.endMonth || !filter.year) {
      return allTickets;
    }

    const { startMonth, endMonth, year } = filter;
    const y = Number(year);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;

    return allTickets.filter(t => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return false;
      return d >= new Date(y, mStart, 1) && d < new Date(y, mEnd + 1, 1);
    });
  },
}));

export default useDataStore;

// We also need to create the dataProcessing file
// I'll assume this for now and create it in the next step. 