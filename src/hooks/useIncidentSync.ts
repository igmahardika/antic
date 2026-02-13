import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { incidentAPI } from '@/lib/api';

export const useIncidentSync = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const syncData = async (force = false) => {
        try {
            setIsSyncing(true);
            const count = await db.incidents.count();

            // Only sync if empty or forced
            if (count === 0 || force) {
                // Increase limit to ensure we get all historical data
                const { incidents } = await incidentAPI.getIncidents({ limit: 10000 });

                if (incidents && incidents.length > 0) {
                    await db.incidents.clear();
                    await db.incidents.bulkAdd(incidents);
                    setLastSync(new Date());
                    logger.info(`Synced ${incidents.length} incidents from server`);
                    return true; // value indicating sync happened
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
