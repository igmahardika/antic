import Dexie, { Table } from 'dexie';
import { Incident, IncidentRecord } from '@/types/incident';

// Definisikan struktur data tiket yang akan disimpan di IndexedDB
export interface ITicket {
  id: string; // Kunci utama, UUID unik
  customerId: string;
  name: string; // Nama Pelanggan
  category: string;
  description: string;
  cause: string;
  handling: string;
  openTime: string; // ISO String date format for querying
  closeTime?: string;
  duration: { rawHours: number; formatted: string };
  closeHandling?: string;
  handlingDuration: { rawHours: number; formatted: string };
  classification?: string;
  subClassification?: string;
  status?: string;
  handling1?: string;
  closeHandling1?: string;
  handlingDuration1: { rawHours: number; formatted: string };
  handling2?: string;
  closeHandling2?: string;
  handlingDuration2: { rawHours: number; formatted: string };
  handling3?: string;
  closeHandling3?: string;
  handlingDuration3: { rawHours: number; formatted: string };
  handling4?: string;
  closeHandling4?: string;
  handlingDuration4: { rawHours: number; formatted: string };
  handling5?: string;
  closeHandling5?: string;
  handlingDuration5: { rawHours: number; formatted: string };
  openBy?: string;
  cabang?: string;
  // Properti tambahan untuk mempermudah query
  uploadTimestamp: number; // Timestamp kapan data diupload
  repClass?: string; // Repeat-complainer class (Normal, Persisten, Kronis, Ekstrem)
}

export interface IUser {
  id?: number;
  username: string;
  password: string;
  role: 'super admin' | 'admin' | 'user';
}

export interface IMenuPermission {
  id?: number;
  role: 'super admin' | 'admin' | 'user';
  menus: string[];
}

export interface ICustomer {
  id: string; // UUID unik
  nama: string;
  jenisKlien: string;
  layanan: string;
  kategori: string;
}

export class TicketDB extends Dexie {
  tickets!: Table<ITicket>;
  users!: Table<IUser, number>;
  menuPermissions!: Table<IMenuPermission, number>;
  customers!: Table<ICustomer, string>;
  incidents!: Table<Incident, string>; // pk = id
  incident!: Table<IncidentRecord, string>; // pk = rowKey

  constructor() {
    super('InsightTicketDatabase');
    this.version(1).stores({
      tickets: 'id, openTime, name, uploadTimestamp'
    });
    this.version(2).stores({
      tickets: 'id, openTime, name, uploadTimestamp, cabang'
    });
    this.version(3).stores({
      tickets: 'id, openTime, name, uploadTimestamp, cabang',
      users: '++id, username, role',
      menuPermissions: '++id, role'
    });
    this.version(4).stores({
      tickets: 'id, openTime, name, uploadTimestamp, cabang',
      users: '++id, username, role',
      menuPermissions: '++id, role',
      customers: 'id, nama, jenisKlien, layanan, kategori'
    });
    this.version(5).stores({
      tickets: 'id, openTime, name, uploadTimestamp, cabang',
      users: '++id, username, role',
      menuPermissions: '++id, role',
      customers: 'id, nama, jenisKlien, layanan, kategori',
      // Index yang sering dipakai filter:
      // startTime, status, priority, site, klasifikasiGangguan, level, ncal, noCase
      incidents: `
        id,
        startTime, status, priority, site,
        klasifikasiGangguan, level, ncal, noCase
      `
    });
    this.version(6).stores({
      tickets: 'id, openTime, name, uploadTimestamp, cabang',
      users: '++id, username, role',
      menuPermissions: '++id, role',
      customers: 'id, nama, jenisKlien, layanan, kategori',
      incidents: `
        id,
        startTime, status, priority, site,
        klasifikasiGangguan, level, ncal, noCase
      `,
      // Skema baru untuk incident record dengan NCAL sebagai acuan utama
      incident: `
        rowKey,
        ncal, sheet, openTime, closeTime, site, category, ncalLevel
      `
    });
  }
}

export const db = new TicketDB(); 