
import ExcelJS from 'exceljs';

// Mimic CANON and utils locally to avoid import issues
const CANON = {
    start: "start",
    // ... others not needed for minimal repro of parsing
};

const HEADER_SYNONYMS = {
    [CANON.start]: ["start", "mulai", "start time", "waktu mulai", "start gangguan"],
};

function normalizeHeader(s) {
    if (s == null) return "";
    return String(s).replace(/\ufeff/g, "").trim().toLowerCase().replace(/[\/_-]+/g, " ").replace(/\s+/g, " ");
}

function parseDateSafe(dt) {
    if (!dt) return null;
    if (dt instanceof Date) return isNaN(dt.getTime()) ? null : dt.toISOString();
    const s = String(dt).trim();
    if (!s) return null;

    // The logic from incidentUtils.ts
    const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
        /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/,
        /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{1,2})$/,
    ];

    for (const format of formats) {
        const match = s.match(format);
        if (match) {
            // ... logic to construct date
            // Simplified for test:
            console.log(`Matched Regex for: ${s}`);
            return "VALID_ISO_DATE";
        }
    }
    return null;
}

function coerceDate(v) {
    if (v == null || v === "") return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
    if (typeof v === "number" && isFinite(v)) {
        // excel serial
        return "VALID_SERIAL_DATE";
    }
    if (typeof v === "string") return parseDateSafe(v);
    return null;
}

async function runTest() {
    console.log("Creating sample Excel...");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(['No Case', 'Start', 'Status']); // Headers
    sheet.addRow(['C123', '04/01/2025 08:31', 'Open']); // Data 1 (Text)

    // Write to buffer then read back to simulate dropzone file read
    const buffer = await workbook.xlsx.writeBuffer();

    console.log("Reading Excel...");
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(buffer);
    const ws = wb2.getWorksheet(1);

    // Scan rows
    const rows = [];
    ws.eachRow((row) => {
        const rowValues = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            let value = cell.value;
            // logic from IncidentUpload.tsx
            if (value instanceof Date) rowValues[colNumber - 1] = value;
            else if (cell.type === ExcelJS.ValueType.Date) rowValues[colNumber - 1] = new Date(cell.value);
            else rowValues[colNumber - 1] = value ?? null;
        });
        rows.push(rowValues);
    });

    console.log("Rows extracted:", rows);

    // Check Parsing
    const rawDate = rows[1][1];
    console.log(`Raw Date Value: '${rawDate}' (Type: ${typeof rawDate})`);

    const parsed = coerceDate(rawDate);
    console.log(`Parsed Result: ${parsed}`);

    if (parsed) console.log("✅ SUCCESS");
    else console.log("❌ FAILED");
}

runTest();
