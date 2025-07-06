import Dexie, { Table } from 'dexie';

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

export class TicketDB extends Dexie {
  tickets!: Table<ITicket>;
  users!: Table<IUser, number>;
  menuPermissions!: Table<IMenuPermission, number>;

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
  }
}

export const db = new TicketDB(); 