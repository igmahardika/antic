import React, { useEffect, useState } from "react";

type RechartsModule = typeof import("recharts");
let _mod: RechartsModule | null = null;
let _loading: Promise<RechartsModule> | null = null;

function loadRecharts(): Promise<RechartsModule> {
	if (_mod) return Promise.resolve(_mod);
	if (_loading) return _loading;
	_loading = import("recharts").then((m) => {
		_mod = m;
		return m;
	});
	return _loading;
}

function useRecharts(): RechartsModule | null {
	const [mod, setMod] = useState<RechartsModule | null>(_mod);
	useEffect(() => {
		if (!mod) {
			loadRecharts()
				.then(setMod)
				.catch(() => setMod(null));
		}
	}, [mod]);
	return mod;
}

function proxy<K extends keyof RechartsModule>(key: K) {
	const Comp = (props: any) => {
		const M = useRecharts();
		if (!M) return null; // atau skeleton kecil jika perlu
		const Target: any = (M as any)[key];
		return React.createElement(Target, props);
	};
	Comp.displayName = `LazyRecharts_${String(key)}`;
	return Comp;
}

// Ekspor komponen umum Recharts via proxy
export const ResponsiveContainer = proxy("ResponsiveContainer");
export const LineChart = proxy("LineChart");
export const Line = proxy("Line");
export const AreaChart = proxy("AreaChart");
export const Area = proxy("Area");
export const BarChart = proxy("BarChart");
export const Bar = proxy("Bar");
export const PieChart = proxy("PieChart");
export const Pie = proxy("Pie");
export const CartesianGrid = proxy("CartesianGrid");
export const XAxis = proxy("XAxis");
export const YAxis = proxy("YAxis");
export const Tooltip = proxy("Tooltip");
export const Legend = proxy("Legend");
export const ReferenceLine = proxy("ReferenceLine");
export const Brush = proxy("Brush");
