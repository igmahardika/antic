// Debug script untuk melihat data tickets di IndexedDB
// Jalankan di browser console di halaman http://localhost:5173

console.log('🔍 Debugging Ticket Data...');

// Fungsi untuk mengakses IndexedDB
async function debugTickets() {
  try {
    // Buka IndexedDB
    const request = indexedDB.open('TicketDB', 1);
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['tickets'], 'readonly');
      const objectStore = transaction.objectStore('tickets');
      const getAllRequest = objectStore.getAll();
      
      getAllRequest.onsuccess = function(event) {
        const tickets = event.target.result;
        
        console.log('📊 Total Tickets:', tickets.length);
        
        if (tickets.length > 0) {
          // Analisis status tickets
          const statusCount = {};
          const sampleTickets = tickets.slice(0, 10);
          
          tickets.forEach(ticket => {
            const status = (ticket.status || 'undefined').trim().toLowerCase();
            statusCount[status] = (statusCount[status] || 0) + 1;
          });
          
          console.log('📈 Status Distribution:', statusCount);
          console.log('🎫 Sample Tickets (first 10):', sampleTickets.map(t => ({
            id: t.id,
            status: t.status,
            openTime: t.openTime,
            closeTime: t.closeTime,
            hasCloseTime: !!t.closeTime
          })));
          
          // Analisis open tickets
          const openTickets = tickets.filter(t => {
            const status = (t.status || '').trim().toLowerCase();
            
            // Jika status adalah 'OPEN TICKET' atau 'OPEN', ini adalah tiket open
            if (status === 'open ticket' || status === 'open') return true;
            
            // Jika status closed, bukan tiket open
            if (status === 'closed' || status === 'close ticket' || status === 'close') return false;
            
            // Jika tidak ada closeTime, termasuk tiket open
            if (!t.closeTime) return true;
            
            // Cek apakah closeTime di bulan berikutnya dari openTime
            const openDate = new Date(t.openTime);
            const closeDate = new Date(t.closeTime);
            
            if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return true;
            
            // Bandingkan bulan dan tahun
            const openMonth = openDate.getMonth();
            const openYear = openDate.getFullYear();
            const closeMonth = closeDate.getMonth();
            const closeYear = closeDate.getFullYear();
            
            // Jika tahun closeTime lebih besar, atau tahun sama tapi bulan lebih besar
            if (closeYear > openYear || (closeYear === openYear && closeMonth > openMonth)) {
              return true;
            }
            
            return false;
          });
          
          console.log('🔓 Open Tickets Count:', openTickets.length);
          console.log('🔓 Sample Open Tickets:', openTickets.slice(0, 5).map(t => ({
            status: t.status,
            openTime: t.openTime,
            closeTime: t.closeTime,
            reason: !t.closeTime ? 'No closeTime' : 
                   (t.status || '').toLowerCase().includes('open') ? 'Open status' : 'CloseTime in next month'
          })));
          
          // Analisis closed tickets
          const closedTickets = tickets.filter(t => {
            const status = (t.status || '').trim().toLowerCase();
            return status === 'closed' || status === 'close ticket' || status === 'close';
          });
          
          console.log('🔒 Closed Tickets Count:', closedTickets.length);
          
          // Analisis monthly stats
          const monthlyStats = {};
          tickets.forEach(ticket => {
            const d = new Date(ticket.openTime);
            if (!isNaN(d.getTime())) {
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const yyyy = d.getFullYear();
              const monthYear = `${yyyy}-${mm}`;
              if (!monthlyStats[monthYear]) {
                monthlyStats[monthYear] = { incoming: 0, open: 0, closed: 0 };
              }
              monthlyStats[monthYear].incoming++;
              
              const status = (ticket.status || '').trim().toLowerCase();
              if (status === 'closed' || status === 'close ticket' || status === 'close') {
                monthlyStats[monthYear].closed++;
              } else {
                monthlyStats[monthYear].open++;
              }
            }
          });
          
          console.log('📅 Monthly Stats:', monthlyStats);
          
        } else {
          console.log('❌ No tickets found in IndexedDB');
        }
      };
      
      getAllRequest.onerror = function(event) {
        console.error('❌ Error getting tickets:', event.target.error);
      };
    };
    
    request.onerror = function(event) {
      console.error('❌ Error opening IndexedDB:', event.target.error);
    };
    
  } catch (error) {
    console.error('❌ Error in debugTickets:', error);
  }
}

// Jalankan debugging
debugTickets();

console.log('✅ Debug script loaded. Check console output above.');