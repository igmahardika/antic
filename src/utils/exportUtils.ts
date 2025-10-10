import Papa from "papaparse";
import { logger } from "@/lib/logger";

// PDF Export using Backend API (Server-side)
export const generatePDFWithAPI = async (
	customerData: any,
	ticketsData: any[],
	insightData: any,
) => {
	try {
		const response = await fetch(
			"http://api.hms.nexa.net.id/api/generate-pdf",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					customerData,
					ticketsData,
					insightData,
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		// Get PDF blob
		const pdfBlob = await response.blob();

		// Create download link
		const url = window.URL.createObjectURL(pdfBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `CustomerReport-${customerData.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
		link.click();
		window.URL.revokeObjectURL(url);
	} catch (error) {
		logger.error("PDF generation error:", error);
		throw error;
	}
};

// PDF Export using Puppeteer (Server-side)
export const generatePDFWithPuppeteer = async (htmlContent: string) => {
	try {
		// Note: This would be implemented on the server-side
		// For now, we'll create a function that can be called from the server
		const puppeteer = await import("puppeteer");
		const browser = await puppeteer.default.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

		const page = await browser.newPage();
		await page.setContent(htmlContent, { waitUntil: "networkidle0" });

		const pdfBuffer = await page.pdf({
			format: "A4",
			printBackground: true,
			margin: {
				top: "20mm",
				right: "20mm",
				bottom: "20mm",
				left: "20mm",
			},
		});

		await browser.close();
		return pdfBuffer;
	} catch (error) {
		logger.error("PDF generation error:", error);
		throw error;
	}
};

// Excel Export using ExcelJS
export const exportToExcel = async (
	data: any[],
	filename: string,
	sheetName: string = "Sheet1",
) => {
	try {
		const ExcelJS = await import("exceljs");
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet(sheetName);

		// Auto-generate headers from first data object
		if (data.length > 0) {
			const headers = Object.keys(data[0]);
			worksheet.columns = headers.map((header) => ({
				header: header.charAt(0).toUpperCase() + header.slice(1),
				key: header,
				width: Math.max(header.length * 2, 15),
			}));

			// Add data
			data.forEach((row) => {
				worksheet.addRow(row);
			});

			// Style header row
			const headerRow = worksheet.getRow(1);
			headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
			headerRow.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF366092" },
			};
		}

		// Generate Excel file
		const buffer = await workbook.xlsx.writeBuffer();

		// Create download link
		const blob = new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${filename}.xlsx`;
		link.click();
		window.URL.revokeObjectURL(url);
	} catch (error) {
		logger.error("Excel export error:", error);
		throw error;
	}
};

// CSV Export using Papa Parse
export const exportToCSV = (data: any[], filename: string) => {
	try {
		const csv = Papa.unparse(data, {
			header: true,
			delimiter: ",",
			quotes: true,
			quoteChar: '"',
			escapeChar: '"',
		});

		// Create download link
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${filename}.csv`;
		link.click();
		window.URL.revokeObjectURL(url);
	} catch (error) {
		logger.error("CSV export error:", error);
		throw error;
	}
};

// HTML Template Generator for PDF
export const generateCustomerReportHTML = (
	customer: any,
	tickets: any[],
	insight: any,
) => {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("id-ID", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const closedTickets = tickets.filter((t) => t.status === "Closed").length;
	const avgHandling =
		tickets.length > 0
			? (
					tickets.reduce(
						(acc, t) => acc + (t.handlingDuration?.rawHours || 0),
						0,
					) / tickets.length
				).toFixed(1)
			: "0";

	return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Customer Report - ${customer.name}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        
        body {
          font-family: 'Helvetica', Arial, sans-serif;
          margin: 0;
          padding: 0;
          font-size: 10px;
          line-height: 1.4;
        }
        
        .cover-page {
          position: relative;
          width: 100%;
          height: 100vh;
          background-image: url('/Cover.png');
          background-size: cover;
          background-position: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 40px;
          transform: translateY(-70%);
        }
        
        .cover-title {
          font-size: 40px;
          font-weight: bold;
          color: white;
          text-transform: uppercase;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
          margin-bottom: 10px;
        }
        
        .cover-customer-info {
          margin-bottom: 2px;
        }
        
        .cover-customer-name {
          font-size: 10px;
          font-weight: bold;
          color: white;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
          margin-bottom: 8px;
        }
        
        .cover-customer-id {
          font-size: 8px;
          color: white;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }
        
        .content-page {
          padding: 20px;
          background: white;
        }
        
        .page-header {
          width: 100%;
          height: auto;
          margin-bottom: 10px;
        }
        
        .page-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          height: auto;
        }
        
        .section-title {
          font-size: 12px;
          font-weight: bold;
          color: #1e293b;
          margin-top: 12px;
          margin-bottom: 6px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin-bottom: 15px;
        }
        
        .summary-card {
          padding: 10px;
          background-color: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .summary-label {
          font-size: 8px;
          color: #64748b;
          margin-bottom: 4px;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: 0.5px;
        }
        
        .summary-value {
          font-size: 14px;
          font-weight: bold;
          color: #1e293b;
          line-height: 1.2;
        }
        
        .insight-box {
          background-color: #f8fafc;
          padding: 12px;
          margin-bottom: 15px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .insight-item {
          margin-bottom: 8px;
          display: flex;
          align-items: flex-start;
        }
        
        .insight-label {
          font-size: 8px;
          font-weight: bold;
          color: white;
          margin-bottom: 0;
          padding: 2px 8px;
          border-radius: 4px;
          min-width: 70px;
          text-align: center;
          letter-spacing: 0.3px;
        }
        
        .insight-value {
          font-size: 9px;
          color: #1f2937;
          line-height: 1.3;
          flex: 1;
          margin-left: 8px;
          font-weight: 500;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          margin-bottom: 8px;
          font-size: 8px;
        }
        
        .table th {
          background-color: #f3f4f6;
          font-weight: bold;
          padding: 3px;
          border: 1px solid #e5e7eb;
          text-align: left;
        }
        
        .table td {
          padding: 3px;
          border: 1px solid #e5e7eb;
          line-height: 1.0;
        }
        
        .table tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .status-badge {
          border-radius: 8px;
          padding: 1px 4px;
          font-size: 8px;
          font-weight: bold;
          text-align: center;
        }
        
        .status-closed {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .status-open {
          background-color: #fef3c7;
          color: #92400e;
        }
        
        .status-pending {
          background-color: #fce7f3;
          color: #be185d;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .month-header {
          background-color: #f1f5f9;
          padding: 2px;
          margin-top: 10px;
        }
        
        .month-label {
          font-weight: bold;
          font-size: 8px;
          color: #1e293b;
        }
      </style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="cover-page">
        <div class="cover-title">TICKET REPORT</div>
        <div class="cover-customer-info">
          <div class="cover-customer-name">${customer.name}</div>
          <div class="cover-customer-id">Customer ID: ${customer.customerId}</div>
        </div>
      </div>
      
      <!-- Content Page -->
      <div class="content-page page-break">
        <img src="/Header.png" class="page-header" alt="Header">
        
        <div class="section-title">Summary Metrics</div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Tickets</div>
            <div class="summary-value">${tickets.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Closed</div>
            <div class="summary-value">${closedTickets}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Avg Handling</div>
            <div class="summary-value">${avgHandling}h</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Risk Trend</div>
            <div class="summary-value">${customer.trend || "Stable"}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Top Issue</div>
            <div class="summary-value">${insight?.topIssue || "-"}</div>
          </div>
        </div>
        
        <div class="section-title">Automated Insight</div>
        <div class="insight-box">
          <div class="insight-item">
            <div class="insight-label" style="background-color: #ef4444;">Problem</div>
            <div class="insight-value">${insight?.problem || "-"}</div>
          </div>
          <div class="insight-item">
            <div class="insight-label" style="background-color: #f59e0b;">Cause</div>
            <div class="insight-value">${insight?.cause || "-"}</div>
          </div>
          <div class="insight-item">
            <div class="insight-label" style="background-color: #3b82f6;">Category</div>
            <div class="insight-value">${insight?.category || "-"}</div>
          </div>
          <div class="insight-item">
            <div class="insight-label" style="background-color: #10b981;">Solution</div>
            <div class="insight-value">${insight?.solution || "-"}</div>
          </div>
        </div>
        
        <div class="section-title">Ticket History</div>
        ${generateTicketHistoryHTML(tickets)}
        
        <img src="/Footer.png" class="page-footer" alt="Footer">
      </div>
    </body>
    </html>
  `;
};

// Helper function to generate ticket history HTML
const generateTicketHistoryHTML = (tickets: any[]) => {
	// Group tickets by month
	const groups: { [key: string]: any[] } = {};
	tickets.forEach((t) => {
		if (!t.openTime) return;
		const d = new Date(t.openTime);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		if (!groups[key]) groups[key] = [];
		groups[key].push(t);
	});

	const sortedKeys = Object.keys(groups).sort(
		(a, b) => Number(new Date(b + "-01")) - Number(new Date(a + "-01")),
	);

	let html = "";
	sortedKeys.forEach((key, index) => {
		const monthName = new Date(key + "-01").toLocaleDateString("id-ID", {
			year: "numeric",
			month: "long",
		});

		if (index > 0) {
			html += '<div class="page-break"></div>';
		}

		html += `
      <div class="month-header">
        <div class="month-label">${monthName}</div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Description</th>
            <th>Status</th>
            <th>Open Time</th>
            <th>Close Time</th>
            <th>Handling Duration</th>
          </tr>
        </thead>
        <tbody>
          ${groups[key]
						.map(
							(ticket) => `
            <tr>
              <td>${ticket.ticketId || "-"}</td>
              <td>${ticket.description || "-"}</td>
              <td>
                <span class="status-badge status-${ticket.status?.toLowerCase()}">
                  ${ticket.status || "-"}
                </span>
              </td>
              <td>${ticket.openTime ? formatDate(ticket.openTime) : "-"}</td>
              <td>${ticket.closeTime ? formatDate(ticket.closeTime) : "-"}</td>
              <td>${ticket.handlingDuration?.formatted || "-"}</td>
            </tr>
          `,
						)
						.join("")}
        </tbody>
      </table>
    `;
	});

	return html;
};

// Helper function to format date
const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("id-ID", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};
