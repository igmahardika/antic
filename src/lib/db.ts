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
  fcr: 'Yes' | 'No';
}

export class TicketDB extends Dexie {
  tickets!: Table<ITicket>;

  constructor() {
    super('InsightTicketDatabase');
    this.version(1).stores({
      // '++id' akan auto-increment jika kita tidak menyediakan id.
      // Karena kita pakai UUID, kita hanya definisikan 'id' sebagai primary key.
      // Kolom setelahnya adalah indeks untuk query cepat.
      tickets: 'id, openTime, name, uploadTimestamp'
    });
    this.version(2).stores({
        tickets: 'id, openTime, name, uploadTimestamp, cabang'
    });
  }
}

export const db = new TicketDB(); 