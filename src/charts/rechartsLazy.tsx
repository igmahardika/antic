import { lazy } from "react";

// Common
export const ResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));
export const CartesianGrid = lazy(() => import("recharts").then(m => ({ default: m.CartesianGrid })));
export const XAxis = lazy(() => import("recharts").then(m => ({ default: m.XAxis })));
export const YAxis = lazy(() => import("recharts").then(m => ({ default: m.YAxis })));
export const Tooltip = lazy(() => import("recharts").then(m => ({ default: m.Tooltip })));
export const RechartsTooltip = Tooltip;
export const Legend = lazy(() => import("recharts").then(m => ({ default: m.Legend })));

// Line
export const LineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
export const Line = lazy(() => import("recharts").then(m => ({ default: m.Line })));
export const ReferenceLine = lazy(() => import("recharts").then(m => ({ default: m.ReferenceLine })));

// Bar
export const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
export const Bar = lazy(() => import("recharts").then(m => ({ default: m.Bar })));
export const Cell = lazy(() => import("recharts").then(m => ({ default: m.Cell })));

// Area
export const AreaChart = lazy(() => import("recharts").then(m => ({ default: m.AreaChart })));
export const Area = lazy(() => import("recharts").then(m => ({ default: m.Area })));

// Pie
export const PieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));
export const Pie = lazy(() => import("recharts").then(m => ({ default: m.Pie })));

// Composed
export const ComposedChart = lazy(() => import("recharts").then(m => ({ default: m.ComposedChart })));
