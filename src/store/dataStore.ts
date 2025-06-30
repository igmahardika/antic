import { create } from 'zustand';
import { db, ITicket } from '@/lib/db';

interface IFilterValues {
  startMonth: string | null;
  endMonth: string | null;
  year: string | null;
}

interface DataStoreState {
  allTickets: ITicket[] | null;
  isLoading: boolean;
  filters: Record<string, IFilterValues>;
  error: string | null;
  initialize: () => Promise<void>;
  setFilter: (key: string, newFilters: Partial<IFilterValues>) => void;
  getFilteredTickets: (key: string) => ITicket[];
  updateTicketStatus: (ticketId: string, newStatus: 'Open' | 'In Progress' | 'Closed') => void;
}

const useDataStore = create<DataStoreState>((set, get) => ({
  allTickets: null,
  isLoading: true,
  filters: {},
  error: null,

  initialize: async () => {
    try {
      const tickets = await db.tickets.toArray();
      set({ allTickets: tickets, isLoading: false });
    } catch (error) {
      console.error("Failed to load tickets from DB", error);
      set({ isLoading: false });
    }
  },

  setFilter: (key, newFilters) => {
    set(state => {
      const existingFilters = state.filters[key] || { startMonth: null, endMonth: null, year: null };
      const updatedFilters = { ...existingFilters, ...newFilters };

      // Ensure if one month is selected, both start and end are set
      if (updatedFilters.startMonth && !updatedFilters.endMonth) {
        updatedFilters.endMonth = updatedFilters.startMonth;
      } else if (updatedFilters.endMonth && !updatedFilters.startMonth) {
        updatedFilters.startMonth = updatedFilters.endMonth;
      }

      return {
        filters: {
          ...state.filters,
          [key]: updatedFilters,
        }
      };
    });
  },
  
  getFilteredTickets: (key: string) => {
    const { allTickets, filters } = get();
    const filter = filters[key];

    if (!filter || !filter.startMonth || !filter.endMonth || !filter.year) {
      return allTickets || [];
    }

    const { startMonth, endMonth, year } = filter;
    const y = Number(year);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;

    return allTickets?.filter(t => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return false;
      return d >= new Date(y, mStart, 1) && d < new Date(y, mEnd + 1, 1);
    }) || [];
  },

  updateTicketStatus: (ticketId, newStatus) => {
    set(state => ({
      allTickets: state.allTickets ? state.allTickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      ) : null
    }));
    // Optionally, also update this in the database
    db.tickets.update(ticketId, { status: newStatus });
  }
}));

export default useDataStore;

// We also need to create the dataProcessing file
// I'll assume this for now and create it in the next step. 