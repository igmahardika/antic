/**
 * Cache Service
 * 
 * Manages IndexedDB as a cache layer for API responses.
 * Provides get/set operations with TTL (Time To Live) support.
 */

import { db } from '../lib/db';
import { ticketAPI, Ticket } from '../lib/api';

export interface ICacheEntry {
    key: string;
    data: any;
    timestamp: number;
    ttl: number;
    filters?: any;
}

export interface TicketFilter {
    search?: string;
    category?: string;
    status?: string;
    cabang?: string;
    startDate?: string;
    endDate?: string;
}

class CacheService {
    private defaultTTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Generate cache key from filter parameters
     */
    private generateCacheKey(prefix: string, filters?: any): string {
        if (!filters) return prefix;
        const filterStr = JSON.stringify(filters);
        return `${prefix}_${btoa(filterStr)}`;
    }

    /**
     * Get data from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const cached = await (db as any).cache?.get(key);
            if (!cached) return null;

            // Check if cache is still valid
            if (this.isStale(cached)) {
                await this.invalidate(key);
                return null;
            }

            return cached.data as T;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set data in cache with TTL
     */
    async set(key: string, data: any, ttl?: number): Promise<void> {
        try {
            const entry: ICacheEntry = {
                key,
                data,
                timestamp: Date.now(),
                ttl: ttl || this.defaultTTL,
            };

            await (db as any).cache?.put(entry);
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Check if cache entry is stale
     */
    isStale(entry: ICacheEntry): boolean {
        const now = Date.now();
        return now - entry.timestamp > entry.ttl;
    }

    /**
     * Invalidate cache by key
     */
    async invalidate(key: string): Promise<void> {
        try {
            await (db as any).cache?.delete(key);
        } catch (error) {
            console.error('Cache invalidate error:', error);
        }
    }

    /**
     * Invalidate all cache entries matching pattern
     */
    async invalidatePattern(pattern: string): Promise<void> {
        try {
            const allEntries = await (db as any).cache?.toArray();
            if (!allEntries) return;

            const toDelete = allEntries.filter((entry: ICacheEntry) =>
                entry.key.startsWith(pattern)
            );

            await Promise.all(
                toDelete.map((entry: ICacheEntry) => this.invalidate(entry.key))
            );
        } catch (error) {
            console.error('Cache invalidate pattern error:', error);
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        try {
            await (db as any).cache?.clear();
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    /**
     * Get tickets with caching
     */
    async getTickets(filters?: TicketFilter): Promise<Ticket[]> {
        const cacheKey = this.generateCacheKey('tickets', filters);

        // Try cache first
        const cached = await this.get<Ticket[]>(cacheKey);
        if (cached) {
            console.log('[Cache] Hit:', cacheKey);
            // Optionally refresh in background
            this.refreshInBackground(cacheKey, filters);
            return cached;
        }

        console.log('[Cache] Miss:', cacheKey);
        // Fetch from API
        const { tickets } = await ticketAPI.getTickets({
            ...filters,
            limit: 5000, // Reduced from 10k to 5k for better responsiveness
        });

        // Store in cache (as is from API for now, or mapped? Let's map it before caching so checks work)
        // Actually typically we cache the API response. But our frontend ITicket expects mapped data.
        // Let's map it here.
        const mappedTickets = tickets.map(t => this.mapApiTicketToITicket(t));

        await this.set(cacheKey, mappedTickets);

        return mappedTickets;
    }

    /**
     * Refresh cache in background (non-blocking)
     */
    private async refreshInBackground(
        cacheKey: string,
        filters?: TicketFilter
    ): Promise<void> {
        try {
            // Don't await - run in background
            setTimeout(async () => {
                const { tickets } = await ticketAPI.getTickets({
                    ...filters,
                    limit: 5000,
                });
                const mappedTickets = tickets.map(t => this.mapApiTicketToITicket(t));
                await this.set(cacheKey, mappedTickets);
                console.log('[Cache] Refreshed in background:', cacheKey);
            }, 100);
        } catch (error) {
            console.error('[Cache] Background refresh failed:', error);
        }
    }

    /**
     * Get ticket count with caching
     */
    async getTicketCount(): Promise<number> {
        const cacheKey = 'tickets_count';

        const cached = await this.get<number>(cacheKey);
        if (cached !== null) {
            console.log('[Cache] Count hit:', cached);
            return cached;
        }

        // Fetch from API
        const { pagination } = await ticketAPI.getTickets({ limit: 1 });
        const count = pagination?.total || 0;

        // Store in cache with shorter TTL (1 minute)
        await this.set(cacheKey, count, 60 * 1000);

        return count;
    }

    /**
     * Invalidate all ticket-related cache
     */
    async invalidateTickets(): Promise<void> {
        await this.invalidatePattern('tickets');
        console.log('[Cache] Invalidated all ticket caches');
    }

    /**
     * Get customers with caching
     */
    async getCustomers(filters?: any): Promise<any[]> { // Using any[] for Customer[] to avoid import cycles or duplicate interfaces
        const cacheKey = this.generateCacheKey('customers', filters);

        // Try cache first
        const cached = await this.get<any[]>(cacheKey);
        if (cached) {
            console.log('[Cache] Hit:', cacheKey);
            return cached;
        }

        console.log('[Cache] Miss:', cacheKey);
        // Fetch from API
        // @ts-ignore - Importing customerAPI dynamically or using global to avoid circular dep if needed, 
        // but here we can just assume customerAPI is imported. 
        // We need to import customerAPI at top level.
        const { customerAPI } = await import('../lib/api');
        const { customers } = await customerAPI.getCustomers({
            ...filters,
            limit: 10000,
        });

        await this.set(cacheKey, customers);
        return customers;
    }

    /**
     * Get incidents with caching
     */
    async getIncidents(filters?: any): Promise<any[]> {
        const cacheKey = this.generateCacheKey('incidents', filters);

        const cached = await this.get<any[]>(cacheKey);
        if (cached) {
            console.log('[Cache] Hit:', cacheKey);
            return cached;
        }

        console.log('[Cache] Miss:', cacheKey);
        const { incidentAPI } = await import('../lib/api');
        const { incidents } = await incidentAPI.getIncidents({
            ...filters,
            limit: 10000,
        });

        await this.set(cacheKey, incidents);
        return incidents;
    }

    /**
     * Invalidate customers cache
     */
    async invalidateCustomers(): Promise<void> {
        await this.invalidatePattern('customers');
    }

    /**
     * Invalidate incidents cache
     */
    async invalidateIncidents(): Promise<void> {
        await this.invalidatePattern('incidents');
    }
    /**
     * Map API Ticket (snake_case) to Frontend ITicket (camelCase)
     */
    private mapApiTicketToITicket(apiTicket: any): any {
        return {
            id: apiTicket.id,
            customerId: apiTicket.customer_id,
            name: apiTicket.name,
            category: apiTicket.category,
            description: apiTicket.description,
            cause: apiTicket.cause,
            handling: apiTicket.handling,
            openTime: apiTicket.open_time,
            closeTime: apiTicket.close_time,
            duration: {
                rawHours: Number(apiTicket.duration_raw_hours) || 0,
                formatted: apiTicket.duration_formatted || "",
            },
            closeHandling: apiTicket.close_handling,
            handlingDuration: {
                rawHours: Number(apiTicket.handling_duration_raw_hours) || 0,
                formatted: apiTicket.handling_duration_formatted || "",
            },
            classification: apiTicket.classification,
            subClassification: apiTicket.sub_classification,
            status: apiTicket.status,
            handling1: apiTicket.handling1,
            closeHandling1: apiTicket.close_handling1,
            handlingDuration1: {
                rawHours: Number(apiTicket.handling_duration1_raw_hours) || 0,
                formatted: apiTicket.handling_duration1_formatted || "",
            },
            handling2: apiTicket.handling2,
            closeHandling2: apiTicket.close_handling2,
            handlingDuration2: {
                rawHours: Number(apiTicket.handling_duration2_raw_hours) || 0,
                formatted: apiTicket.handling_duration2_formatted || "",
            },
            handling3: apiTicket.handling3,
            closeHandling3: apiTicket.close_handling3,
            handlingDuration3: {
                rawHours: Number(apiTicket.handling_duration3_raw_hours) || 0,
                formatted: apiTicket.handling_duration3_formatted || "",
            },
            handling4: apiTicket.handling4,
            closeHandling4: apiTicket.close_handling4,
            handlingDuration4: {
                rawHours: Number(apiTicket.handling_duration4_raw_hours) || 0,
                formatted: apiTicket.handling_duration4_formatted || "",
            },
            handling5: apiTicket.handling5,
            closeHandling5: apiTicket.close_handling5,
            handlingDuration5: {
                rawHours: Number(apiTicket.handling_duration5_raw_hours) || 0,
                formatted: apiTicket.handling_duration5_formatted || "",
            },
            openBy: apiTicket.open_by,
            cabang: apiTicket.cabang,
            uploadTimestamp: apiTicket.upload_timestamp,
            repClass: apiTicket.rep_class,
        };
    }
}

export const cacheService = new CacheService();
