import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple NLP Helper for keyword extraction
export function analyzeKeywords(texts: string[], topN: number = 3): [string, number][] {
  const stopWords = new Set(['dan', 'di', 'ke', 'dari', 'yang', 'dengan', 'untuk', 'pada', 'saat', 'ini', 'itu', 'adalah', 'tidak', 'bisa', 'sudah', 'belum', 'karena', 'oleh', 'sebagai', 'namun', 'akan', 'atau', 'internet', 'layanan', 'pelanggan', 'gangguan', 'melakukan', 'melaporkan', 'bahwa', 'terjadi']);
  const wordCounts: { [key: string]: number } = {};

  texts.forEach(text => {
    if (!text) return;
    const words = text.toLowerCase().split(/[\s,.\-()]+/).filter(Boolean);
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 3) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
  });

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

// Generates a summary sentence from keywords
export function generateAnalysisConclusion(analysis: { description: string[], cause: string[], handling: string[] }): string {
  const { description, cause, handling } = analysis;
  if (description.length === 0 && cause.length === 0 && handling.length === 0) {
    return "Tidak ada data yang cukup untuk analisis.";
  }
  return `Kendala umum pelanggan ini seringkali terkait masalah "${description.join(', ') || 'tidak spesifik'}", yang cenderung disebabkan oleh "${cause.join(', ') || 'tidak teridentifikasi'}". Solusi yang sering diterapkan adalah dengan "${handling.join(', ') || 'penanganan standar'}".`;
}

// Helper untuk format durasi jam desimal ke HH:MM:SS
export function formatDurationDHM(hours: number): string {
  if (!hours || isNaN(hours) || hours < 0) return '00:00:00';
  const totalSeconds = Math.floor(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Helper untuk format ISO date string menjadi YYYY-MM-DD HH:mm
export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());

    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch (error) {
    return 'N/A';
  }
}

export function formatDateTimeDDMMYYYY(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return 'Invalid Date';
  }
}

// Helper untuk format ISO date string menjadi DD/MM/YYYY HH:MM:SS
export function formatDateTimeDDMMYYYYHHMMSS(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return 'Invalid Date';
  }
}

// Helper untuk menghitung durasi antara dua tanggal dalam format HH:MM:SS
export function calculateDurationHHMMSS(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '00:00:00';
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '00:00:00';
    
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return '00:00:00';
    
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } catch (error) {
    return '00:00:00';
  }
}
