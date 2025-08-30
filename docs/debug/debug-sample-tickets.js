// Script untuk debug sample tickets di browser console
// Copy paste ini di browser console di halaman ticket analytics

console.log('🔍 Debugging Sample Tickets Status...');

// Expand sample tickets dari debug log
// Klik pada [DEBUG] Sample tickets: (5) [{…}, {…}, {…}, {…}, {…}] di console
// Lalu jalankan script ini untuk melihat detail status

// Alternatif: akses langsung dari IndexedDB
const request = indexedDB.open('TicketDB', 1);
request.onsuccess = function(event) {
  const db = event.target.result;
  const transaction = db.transaction(['tickets'], 'readonly');
  const objectStore = transaction.objectStore('tickets');
  const getAllRequest = objectStore.getAll();
  
  getAllRequest.onsuccess = function(event) {
    const tickets = event.target.result;
    
    // Filter tickets untuk Juni 2025 (sesuai filter yang aktif)
    const juneTickets = tickets.filter(t => {
      const d = new Date(t.openTime);
      return d.getFullYear() === 2025 && d.getMonth() === 5; // Juni = month 5
    });
    
    console.log('📊 June 2025 Tickets:', juneTickets.length);
    
    // Analisis status detail
    const statusAnalysis = {};
    const sampleTickets = juneTickets.slice(0, 10);
    
    sampleTickets.forEach((ticket, index) => {
      const status = ticket.status;
      const statusLower = (status || '').trim().toLowerCase();
      
      console.log(`🎫 Ticket ${index + 1}:`, {
        id: ticket.id?.substring(0, 8) + '...',
        status: status,
        statusLower: statusLower,
        openTime: ticket.openTime,
        closeTime: ticket.closeTime,
        hasCloseTime: !!ticket.closeTime,
        isClosedStatus: statusLower === 'closed' || statusLower === 'close ticket' || statusLower === 'close',
        isOpenStatus: statusLower === 'open ticket' || statusLower === 'open'
      });
      
      if (!statusAnalysis[status]) {
        statusAnalysis[status] = 0;
      }
      statusAnalysis[status]++;
    });
    
    console.log('📈 Status Analysis (sample 10):', statusAnalysis);
    
    // Cek semua status unik di Juni 2025
    const allStatuses = new Set();
    juneTickets.forEach(t => {
      allStatuses.add(t.status);
    });
    
    console.log('🎯 All Unique Statuses in June 2025:', Array.from(allStatuses));
    
    // Hitung berdasarkan status aktual
    const statusCount = {};
    juneTickets.forEach(t => {
      const status = t.status || 'undefined';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    console.log('📊 Full Status Count:', statusCount);
    
    // Test logic open tickets
    const manualOpenCount = juneTickets.filter(t => {
      const status = (t.status || '').trim().toLowerCase();
      
      console.log('Testing ticket:', {
        status: status,
        closeTime: t.closeTime,
        isOpen: status === 'open ticket' || status === 'open',
        isClosed: status === 'closed' || status === 'close ticket' || status === 'close',
        hasNoCloseTime: !t.closeTime
      });
      
      // Logic yang sama dengan kode
      if (status === 'open ticket' || status === 'open') return true;
      if (status === 'closed' || status === 'close ticket' || status === 'close') return false;
      if (!t.closeTime) return true;
      
      return false; // Simplified untuk debug
    });
    
    console.log('🔓 Manual Open Count:', manualOpenCount.length);
    console.log('🔓 Manual Open Tickets:', manualOpenCount.slice(0, 3));
  };
};

console.log('✅ Debug script running... Check output above');