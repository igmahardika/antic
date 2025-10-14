import { describe, it, expect } from 'vitest';
const isOpenTicket = (t:any)=>{const s=(t.status||'').trim().toLowerCase();return s==='open'||s==='open ticket'||!t.closeTime;};

describe('Ticket status', () => {
  it('treats missing closeTime as open', () => {
    expect(isOpenTicket({status:'Closed', closeTime:null})).toBe(true);
  });
});
