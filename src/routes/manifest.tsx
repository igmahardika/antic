// src/routes/manifest.tsx
import React, { lazy } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';

// Import paths sesuai dengan struktur proyek yang ada
const Tickets = lazy(() => import('../components/TicketData'));
const TicketAnalytics = lazy(() => import('../components/TicketAnalytics'));
const AgentAnalytics = lazy(() => import('../components/AgentAnalytics'));
const Kanban = lazy(() => import('../components/CustomerAnalytics'));
const NotFound = lazy(() => import('../pages/NotFound'));

export type RouteDef = { name: string; path: string; element: React.ReactNode; legacy?: string[] };

export const ROUTES: RouteDef[] = [
  { name: 'tickets.index', path: '/tickets', element: <Tickets /> },
  { name: 'tickets.analytics', path: '/tickets/analytics', element: <TicketAnalytics />, legacy: ['/analytics', '/ticket/analytics'] },
  { name: 'tickets.kanban', path: '/tickets/kanban', element: <Kanban />, legacy: ['/kanban-board', '/ticket/kanban-board'] },
  { name: 'analytics.agents', path: '/analytics/agents', element: <AgentAnalytics />, legacy: ['/ticket/agent-analytics', '/incident/ts-analytics'] },
];

export function createRoutes(): RouteObject[] {
  const core: RouteObject[] = ROUTES.map((r) => ({ path: r.path, element: r.element }));
  const redirects: RouteObject[] = ROUTES.flatMap((r) => (r.legacy ?? []).map((lp) => ({ path: lp, element: <Navigate to={r.path} replace /> })));
  return [...core, ...redirects, { path: '*', element: <NotFound /> }];
}
