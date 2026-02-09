// Mapping of route paths to menu permission names
export const pathToMenuMap: Record<string, string> = {
    '/': 'Dashboard',
    '/admin': 'Admin Panel',

    // Ticket routes
    '/ticket/grid-view': 'Ticket Data',
    '/ticket/kanban-board': 'Customer Analytics',
    '/ticket/ticket-analytics': 'Ticket Analytics',
    '/ticket/agent-analytics': 'Agent Analytics',
    '/ticket/upload': 'Upload Data',

    // Incident routes
    '/incident/data': 'Incident Data',
    '/incident/analytics': 'Incident Analytics',
    '/incident/ts-analytics': 'Technical Support Analytics',
    '/incident/site-analytics': 'Site Analytics',

    // Master Data routes
    '/masterdata/data-agent': 'Agent Data',
    '/masterdata/data-customer': 'Customer Data',
    '/vendor-data': 'Vendor Data',

    // Documentation routes
    '/documentation/admin-rumus': 'Formulas',

    // Legacy routes (for backwards compatibility)
    '/grid-view': 'Ticket Data',
    '/kanban-board': 'Customer Analytics',
    '/ticket-analytics': 'Ticket Analytics',
    '/agent-analytics': 'Agent Analytics',
    '/upload': 'Upload Data',
    '/summary-dashboard': 'Dashboard',
    '/admin-rumus': 'Formulas',
    '/master-agent': 'Agent Data',
    '/customer': 'Customer Data',
};

export const getMenuNameForPath = (path: string): string | undefined => {
    return pathToMenuMap[path];
};
