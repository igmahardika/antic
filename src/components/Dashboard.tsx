import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import UploadProcess from './UploadProcess';

const Dashboard = () => {
  const allTickets = useLiveQuery(() => db.tickets.toArray());

  if (allTickets === undefined) {
    return <div>Loading dashboard data...</div>;
  }
  
  // If there are no tickets, show the upload screen.
  if (allTickets.length === 0) {
    return <UploadProcess onUploadComplete={() => window.location.reload()} />;
  }

  return (
    <div>
      <h1>Dashboard Loaded</h1>
      <p>Total tickets found: {allTickets.length}</p>
    </div>
  );
};

export default Dashboard;