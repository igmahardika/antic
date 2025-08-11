import { create } from 'zustand';
import { AgentMetric, Ticket, sanitizeTickets, calcAllMetrics, isBacklogTicket } from '@/utils/agentKpi';

interface AgentStore {
  tickets: Ticket[];
  agentMetrics: AgentMetric[];
  setTickets: (tickets: Ticket[]) => void;
  setAgentMetrics: (tickets: Ticket[]) => void;
}

// Fungsi mapping field tiket agar sesuai agentKpi
function mapTicketFieldsForAgentKpi(ticket) {
  let status = ticket.status || ticket.STATUS;
  if (typeof status === 'string') {
    const s = status.trim().toLowerCase();
    if (s === 'close ticket' || s === 'closed') status = 'Closed';
    else if (s === 'open ticket' || s === 'open') status = 'Open';
  }
  const WaktuOpen = ticket['OPEN TIME'] || ticket.openTime;
  const WaktuCloseTicket = ticket['CLOSE TIME'] || ticket.closeTime;
  const ClosePenanganan =
    ticket['CLOSE PENANGANAN'] ||
    ticket.closeHandling ||
    ticket['CLOSE PENANGANAN 1'] ||
    ticket.closeHandling1;
  const Penanganan2 =
    ticket['PENANGANAN 2'] ||
    ticket.Penanganan2 ||
    ticket['CLOSE PENANGANAN 2'] ||
    ticket.closeHandling2;
  const OpenBy = ticket['OPEN BY'] || ticket.openBy;

  const mapped = {
    ...ticket,
    WaktuOpen,
    WaktuCloseTicket,
    ClosePenanganan,
    Penanganan2,
    OpenBy,
    status,
  };
  // Debug: log satu tiket hasil mapping
  if (typeof window !== 'undefined' && window && !(window as any).__agentKpiDebugged) {
    console.log('Mapped ticket for agentKpi:', mapped);
    (window as any).__agentKpiDebugged = true;
  }
  return mapped;
}

// Saat setAgentMetrics dipanggil, pastikan vol dihitung dari jumlah tiket valid (openBy & handlingDuration.rawHours > 0)
function computeAgentMetrics(tickets) {
  // Filter tiket valid untuk agent
  const validTickets = tickets.filter(t => t.openBy && t.handlingDuration && t.handlingDuration.rawHours > 0);
  // Group by agent
  const agentMap = {};
  validTickets.forEach(t => {
    const agent = t.openBy;
    if (!agentMap[agent]) agentMap[agent] = [];
    agentMap[agent].push(t);
  });
  // Hitung KPI per agent (pakai logika calcMetrics)
  return Object.entries(agentMap).map(([agent, arr]) => {
    const ticketsArr = arr as Ticket[];
    // Adaptasi dari calcMetrics
    const vol = ticketsArr.length;
    
    // Menentukan backlog berdasarkan kriteria yang sudah divalidasi:
    // 1. Status adalah "OPEN TICKET"
    // 2. WaktuCloseTicket kosong/null
    // 3. WaktuCloseTicket di bulan berikutnya dari WaktuOpen
    const backlog = ticketsArr.filter(isBacklogTicket).length;
    let frtSum = 0, artSum = 0, frtCount = 0, artCount = 0, fcrCount = 0, slaCount = 0;
    ticketsArr.forEach(t => {
      const open = t.WaktuOpen instanceof Date ? t.WaktuOpen : new Date(t.WaktuOpen);
      const close = t.WaktuCloseTicket ? (t.WaktuCloseTicket instanceof Date ? t.WaktuCloseTicket : new Date(t.WaktuCloseTicket)) : undefined;
      const closePen = t.ClosePenanganan ? (t.ClosePenanganan instanceof Date ? t.ClosePenanganan : new Date(t.ClosePenanganan)) : undefined;
      // FRT: ClosePenanganan - WaktuOpen (minutes)
      if (closePen && open && closePen.getTime() >= open.getTime()) {
        frtSum += (closePen.getTime() - open.getTime()) / 60000;
        frtCount++;
      }
      // ART: WaktuCloseTicket - WaktuOpen (minutes)
      if (close && open && close.getTime() >= open.getTime()) {
        artSum += (close.getTime() - open.getTime()) / 60000;
        artCount++;
      }
      // FCR: hanya 1 penanganan (Penanganan2 kosong/null)
      if (!t.Penanganan2) fcrCount++;
      // SLA: ART <= 1440 min (24 jam)
      if (close && open && (close.getTime() - open.getTime()) / 60000 <= 1440) slaCount++;
    });
    const frt = frtCount ? frtSum / frtCount : 0;
    const art = artCount ? artSum / artCount : 0;
    const fcr = vol ? (fcrCount / vol) * 100 : 0;
    const sla = vol ? (slaCount / vol) * 100 : 0;
    // Score & rank
    const score = (function scoreAgent(m) {
      const frtNorm = m.frt <= 0 ? 100 : Math.max(0, 100 - Math.min(100, m.frt / 4));
      const artNorm = m.art <= 0 ? 100 : Math.max(0, 100 - Math.min(100, m.art / 4));
      const fcrNorm = Math.max(0, Math.min(100, m.fcr));
      const slaNorm = Math.max(0, Math.min(100, m.sla));
      const volNorm = Math.max(0, Math.min(100, (m.vol / 100) * 100));
      const backlogNorm = m.backlog === 0 ? 100 : Math.max(0, 100 - Math.min(100, (m.backlog / 10) * 100));
      return (
        frtNorm * 0.25 +
        artNorm * 0.20 +
        fcrNorm * 0.20 +
        slaNorm * 0.15 +
        volNorm * 0.10 +
        backlogNorm * 0.10
      ) / 1.0;
    })({ frt, art, fcr, sla, vol, backlog });
    const rank = (function rank(score): 'A'|'B'|'C'|'D' {
      if (score >= 60) return 'A';
      if (score >= 50) return 'B';
      if (score >= 40) return 'C';
      return 'D';
    })(score);
    return { agent, frt, art, fcr, sla, vol, backlog, score, rank };
  });
}

export const useAgentStore = create<AgentStore>((set) => ({
  tickets: [],
  agentMetrics: [],
  setTickets: (tickets) => {
    set({ tickets });
    set({ agentMetrics: calcAllMetrics(sanitizeTickets(tickets.map(mapTicketFieldsForAgentKpi))) });
  },
  setAgentMetrics: (tickets) => {
    set({ agentMetrics: computeAgentMetrics(sanitizeTickets(tickets.map(mapTicketFieldsForAgentKpi))) });
  },
}));