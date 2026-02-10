import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export const useIncidentSync = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const syncData = async (force = false) => {
        try {
            setIsSyncing(true);
            const count = await db.incidents.count();

            // Only sync if empty or forced
            if (count === 0 || force) {
                const token = localStorage.getItem('token');
                // Increase limit to ensure we get all historical data
                const response = await fetch('/api/incidents?limit=10000', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && Array.isArray(data.incidents)) {
                        // MAP SNAKE_CASE TO CAMELCASE (Critical Fix)
                        const mappedIncidents = data.incidents.map((r: any) => ({
                            id: String(r.id),
                            noCase: r.no_case,
                            priority: r.priority,
                            site: r.site,
                            ncal: r.ncal,
                            status: r.status,
                            level: r.level,
                            ts: r.ts,
                            odpBts: r.odp_bts,
                            startTime: r.start_time,
                            // Handle potentially null dates properly
                            startEscalationVendor: r.start_escalation_vendor || null,
                            endTime: r.end_time || null,
                            durationMin: r.duration_min || 0,
                            durationVendorMin: r.duration_vendor_min || 0,
                            problem: r.problem,
                            penyebab: r.penyebab,
                            actionTerakhir: r.action_terakhir,
                            note: r.note,
                            klasifikasiGangguan: r.klasifikasi_gangguan,
                            powerBefore: r.power_before,
                            powerAfter: r.power_after,
                            startPause1: r.start_pause1 || null,
                            endPause1: r.end_pause1 || null,
                            startPause2: r.start_pause2 || null,
                            endPause2: r.end_pause2 || null,
                            totalDurationPauseMin: r.total_duration_pause_min || 0,
                            totalDurationVendorMin: r.total_duration_vendor_min || 0,
                            batchId: r.batch_id
                        }));

                        await db.incidents.clear();
                        await db.incidents.bulkAdd(mappedIncidents);
                        setLastSync(new Date());
                        logger.info(`Synced ${mappedIncidents.length} incidents from server`);
                        return true; // value indicating sync happened
                    }
                }
            }
            return false;
        } catch (error) {
            console.error("Sync failed:", error);
            return false;
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-sync on mount
    useEffect(() => {
        syncData().then((didSync) => {
            if (didSync) {
                window.location.reload();
            }
        });
    }, []);

    return { isSyncing, syncData, lastSync };
};
