import Dexie, { Table } from 'dexie';
import type { Incident } from '@/types/incident';

export class AppDB extends Dexie {
  incidents!: Table<Incident, string>;
  
  constructor() {
    super('antic-db');
    // GANTI angka 6 dengan current_version+1 di project kamu
    this.version(6).stores({
      incidents: `
        id,
        startTime, status, priority, site,
        klasifikasiGangguan, level, ncal, noCase
      `,
    });
  }
}

export const db = new AppDB(); 