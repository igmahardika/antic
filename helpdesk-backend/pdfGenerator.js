import puppeteer from 'puppeteer';

export const generatePDFFromHTML = async (htmlContent, options = {}) => {
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    // Create new page
    const page = await browser.newPage();
    
    // Set content and wait for network idle
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      ...options
    });

    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export const generateCustomerReportPDF = async (customerData, ticketsData, insightData) => {
  // This function would generate the HTML template and then convert to PDF
  // For now, we'll return a simple HTML template
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Customer Report - ${customerData.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Customer Report</h1>
        <h2>${customerData.name}</h2>
        <p>Customer ID: ${customerData.customerId}</p>
      </div>
      
      <div class="section">
        <h3>Summary</h3>
        <p>Total Tickets: ${ticketsData.length}</p>
        <p>Closed Tickets: ${ticketsData.filter(t => t.status === 'Closed').length}</p>
      </div>
      
      <div class="section">
        <h3>Ticket History</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Description</th>
              <th>Status</th>
              <th>Open Time</th>
            </tr>
          </thead>
          <tbody>
            ${ticketsData.map(ticket => `
              <tr>
                <td>${ticket.ticketId || '-'}</td>
                <td>${ticket.description || '-'}</td>
                <td>${ticket.status || '-'}</td>
                <td>${ticket.openTime ? new Date(ticket.openTime).toLocaleString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  return await generatePDFFromHTML(htmlTemplate);
};
