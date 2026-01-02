import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TicketData from '../../components/TicketData';
import { ITicket } from '@/lib/db';
import { BrowserRouter } from 'react-router-dom';


// Mock AnalyticsContext
vi.mock('../../components/AnalyticsContext', () => ({
    useAnalytics: () => ({ gridData: [] })
}));

// Mock Dexie hooks
vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: (_fn: any, _deps: any, defaultVal: any) => defaultVal || []

}));

// Mock DB
vi.mock('@/lib/db', () => ({
    db: {
        tickets: { toArray: vi.fn(), count: vi.fn() },
        customers: { toArray: vi.fn() }
    }
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    }
}));

describe('TicketData Integration', () => {
    const mockTickets: ITicket[] = [
        {
            id: '1',
            customerId: 'CUST1',
            name: 'Customer One',
            category: 'Technical',
            description: 'Issue description',
            cause: 'Network',
            handling: 'Reboot',
            openTime: '2025-01-01T10:00:00',
            duration: { rawHours: 1, formatted: '01:00:00' },
            handlingDuration: { rawHours: 0.5, formatted: '00:30:00' },
            handlingDuration1: { rawHours: 0, formatted: '00:00:00' },
            handlingDuration2: { rawHours: 0, formatted: '00:00:00' },
            handlingDuration3: { rawHours: 0, formatted: '00:00:00' },
            handlingDuration4: { rawHours: 0, formatted: '00:00:00' },
            handlingDuration5: { rawHours: 0, formatted: '00:00:00' },
            status: 'Closed',
            uploadTimestamp: Date.now()
        } as ITicket
    ];

    it('renders ticket data from props', () => {
        render(
            <BrowserRouter>
                <TicketData data={mockTickets} />
            </BrowserRouter>
        );

        expect(screen.getByText('Customer One')).toBeInTheDocument();
        expect(screen.getByText('Issue description')).toBeInTheDocument();
        expect(screen.getByText('CUST1')).toBeInTheDocument();
    });

    it('shows no data message when empty', () => {
        render(
            <BrowserRouter>
                <TicketData data={[]} />
            </BrowserRouter>
        );

        expect(screen.getByText(/no tickets found/i)).toBeInTheDocument();
    });
});
