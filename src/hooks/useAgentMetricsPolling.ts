import { useEffect, useRef } from "react";
import { useAgentStore } from "@/store/agentStore";

export function useAgentMetricsPolling(apiUrl: string, isBusyHour: boolean) {
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const interval = isBusyHour ? 5000 : 20000; // 5 detik saat sibuk, 20 detik saat sepi

		const poll = async () => {
			try {
				const res = await fetch(apiUrl);
				const data = await res.json();
				// Hanya update jika data berbeda
				const current = useAgentStore.getState().agentMetrics;
				if (JSON.stringify(current) !== JSON.stringify(data)) {
					useAgentStore.getState().setAgentMetrics(data);
				}
			} catch (e) {
				// Optional: handle error
			}
			intervalRef.current = setTimeout(poll, interval);
		};

		poll();
		return () => {
			if (intervalRef.current) clearTimeout(intervalRef.current);
		};
	}, [apiUrl, isBusyHour]);
}
