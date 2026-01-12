import os

SERVER_FILE = 'helpdesk-backend/server.mjs'

NEW_ENDPOINTS = r'''
// -----------------------------------------------------------------------------
// IMPORTED ENDPOINTS START
// -----------------------------------------------------------------------------

// Bulk insert incidents
app.post('/api/incidents/bulk', authenticateToken, async (req, res) => {
  try {
    const { incidents, metadata } = req.body;
    if (!Array.isArray(incidents)) {
      return res.status(400).json({ error: 'Incidents must be an array' });
    }

    const values = incidents.map(inc => [
      inc.id, inc.noCase, inc.priority, inc.site, inc.ncal, inc.status, inc.level, inc.ts, inc.odpBts,
      inc.startTime, inc.endTime, inc.startEscalationVendor,
      inc.durationMin, inc.durationVendorMin, inc.totalDurationPauseMin, inc.totalDurationVendorMin,
      inc.startPause1, inc.endPause1, inc.startPause2, inc.endPause2,
      inc.problem, inc.penyebab, inc.actionTerakhir, inc.note, inc.klasifikasiGangguan,
      inc.powerBefore, inc.powerAfter,
      inc.batchId || metadata?.batchId, 
      inc.fileName || metadata?.fileName, 
      inc.fileHash || metadata?.fileHash, 
      inc.uploadSessionId || metadata?.uploadSessionId
    ]);

    if (values.length === 0) return res.json({ success: true, created: 0 });

    const query = `
      INSERT INTO incidents (
        id, no_case, priority, site, ncal, status, level, ts, odp_bts,
        start_time, end_time, start_escalation_vendor,
        duration_min, duration_vendor_min, total_duration_pause_min, total_duration_vendor_min,
        start_pause1, end_pause1, start_pause2, end_pause2,
        problem, penyebab, action_terakhir, note, klasifikasi_gangguan,
        power_before, power_after,
        batch_id, file_name, file_hash, upload_session_id
      ) VALUES ?
      ON DUPLICATE KEY UPDATE 
        status = VALUES(status), updated_at = NOW()
    `;

    const [result] = await db.query(query, [values]);
    res.json({ success: true, message: 'Incidents imported', created: result.affectedRows });
  } catch (err) {
    console.error('Bulk insert incidents error:', err);
    res.status(500).json({ error: 'Failed to insert incidents', details: err.message });
  }
});

// Bulk insert customers
app.post('/api/customers/bulk', authenticateToken, async (req, res) => {
  try {
    const { customers, metadata } = req.body;
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: 'Customers must be an array' });
    }

    const values = customers.map(c => [
      c.id, c.nama, c.jenisKlien, c.layanan, c.kategori,
      c.batchId || metadata?.batchId,
      c.fileName || metadata?.fileName
    ]);

    if (values.length === 0) return res.json({ success: true, created: 0 });

    // Ensure customers table exists with correct schema in verify phase
    const query = `
      INSERT INTO customers (id, nama, jenis_klien, layanan, kategori, batch_id, file_name) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE nama = VALUES(nama), updated_at = NOW()
    `;

    const [result] = await db.query(query, [values]);
    res.json({ success: true, message: 'Customers imported', created: result.affectedRows });
  } catch (err) {
    console.error('Bulk insert customers error:', err);
    res.status(500).json({ error: 'Failed to insert customers', details: err.message });
  }
});

// Create Upload Session
app.post('/api/upload-sessions', authenticateToken, async (req, res) => {
  try {
    const session = req.body;
    await db.query(`
      INSERT INTO upload_sessions (id, file_name, file_hash, data_type, upload_timestamp, status, record_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [session.id, session.fileName, session.fileHash, session.dataType, session.uploadTimestamp, session.status, session.recordCount]);
    res.json({ success: true, message: 'Session created' });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update Upload Session
app.put('/api/upload-sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Dynamic update query
    const fields = [];
    const values = [];
    Object.keys(updates).forEach(key => {
      // Convert camelCase to snake_case for specific fields if needed
      if (key === 'recordCount') { fields.push('record_count = ?'); values.push(updates[key]); }
      else if (key === 'successCount') { fields.push('success_count = ?'); values.push(updates[key]); }
      else if (key === 'errorCount') { fields.push('error_count = ?'); values.push(updates[key]); }
      else if (key === 'errorLog') { fields.push('error_log = ?'); values.push(JSON.stringify(updates[key])); }
      else { fields.push(`${key} = ?`); values.push(updates[key]); }
    });
    
    values.push(id);
    await db.query(`UPDATE upload_sessions SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// IMPORTED ENDPOINTS END
// -----------------------------------------------------------------------------
'''

try:
    with open(SERVER_FILE, 'r') as f:
        content = f.read()
    
    # Check if already patched
    if '// IMPORTED ENDPOINTS START' in content:
        print("Server already patched.")
    else:
        # Insert before app.listen
        marker = 'const PORT ='
        if marker in content:
            new_content = content.replace(marker, NEW_ENDPOINTS + '\n\n' + marker)
            with open(SERVER_FILE, 'w') as f:
                f.write(new_content)
            print("Successfully patched server.mjs")
        else:
            print("Could not find marker 'const PORT =' in server.mjs")
            
except Exception as e:
    print(f"Error patching server: {e}")
