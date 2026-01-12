import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import * as ExcelJS from "exceljs";
import PageWrapper from "../components/PageWrapper";
import SummaryCard from "../components/ui/SummaryCard";
import TableChartIcon from "@mui/icons-material/TableChart";
import SearchIcon from "@mui/icons-material/Search";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "../components/ui/table";
import { Card, CardContent } from "../components/ui/card";
import { db } from "../lib/db";
import { customerAPI } from "../lib/api";
import { usePageUrlState } from "../hooks/usePageUrlState";
import { PaginationControls } from "../components";
import { logger } from "@/lib/logger";
import DeleteByFileDialog from "../components/DeleteByFileDialog";
import { createUploadSession, finalizeUploadSession } from '../services/uploadSessions';
import { cacheService } from "@/services/cacheService";

const CUSTOMER_HEADERS = ["Nama", "Jenis Klien", "Layanan", "Kategori"];

const CustomerData: React.FC = () => {
	const [dataPerBulan, setDataPerBulan] = useState<{ [bulan: string]: any[] }>(
		{},
	);
	const [bulanList, setBulanList] = useState<string[]>([]);
	const [bulanDipilih, setBulanDipilih] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [jenisKlienFilter, setJenisKlienFilter] = useState<string>("ALL");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [fileName, setFileName] = useState<string>("");
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	// URL-synced pagination
	const {
		page,
		pageSize,
		setPage,
		setPageSize,
		totalPages: paginationTotalPages,
	} = usePageUrlState({
		totalItems:
			bulanDipilih && dataPerBulan[bulanDipilih]
				? dataPerBulan[bulanDipilih].filter(
					(row) => {
						// Apply jenis klien filter
						const jenisKlienMatch = jenisKlienFilter === "ALL" || row["Jenis Klien"] === jenisKlienFilter;

						// Apply search filter
						const searchMatch = !searchQuery.trim() ||
							Object.values(row).some(value =>
								value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
							);

						return jenisKlienMatch && searchMatch;
					}
				).length
				: 0,
		allowedPageSizes: [25, 50, 100, 200],
		resetOnDeps: [bulanDipilih, jenisKlienFilter, searchQuery],
	});

	// Ambil list jenis klien unik dari dataPerBulan
	const jenisKlienList = React.useMemo(() => {
		if (!bulanDipilih || !dataPerBulan[bulanDipilih]) return [];
		const setJK = new Set<string>();
		dataPerBulan[bulanDipilih].forEach((row) => {
			if (row["Jenis Klien"]) setJK.add(row["Jenis Klien"]);
		});
		return Array.from(setJK);
	}, [dataPerBulan, bulanDipilih]);

	// Paginated data
	const paginatedCustomers = useMemo(() => {
		if (!bulanDipilih || !dataPerBulan[bulanDipilih])
			return { data: [], total: 0 };

		const filtered = dataPerBulan[bulanDipilih].filter(
			(row) => {
				// Apply jenis klien filter
				const jenisKlienMatch = jenisKlienFilter === "ALL" || row["Jenis Klien"] === jenisKlienFilter;

				// Apply search filter
				const searchMatch = !searchQuery.trim() ||
					Object.values(row).some(value =>
						value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
					);

				return jenisKlienMatch && searchMatch;
			}
		);

		const startIdx = (page - 1) * pageSize;
		const endIdx = startIdx + pageSize;
		const paged = filtered.slice(startIdx, endIdx);

		return { data: paged, total: filtered.length };
	}, [dataPerBulan, bulanDipilih, jenisKlienFilter, searchQuery, page, pageSize]);

	// Load customers using CacheService (MySQL-First)
	useEffect(() => {
		(async () => {
			try {
				const customers = await cacheService.getCustomers();
				if (customers && customers.length > 0) {
					const dataPerBulan: { [bulan: string]: any[] } = {};
					customers.forEach((c: any) => {
						const bulan = (c.id || "").split("-")[0];
						const key = bulan || "Data";
						if (!dataPerBulan[key]) dataPerBulan[key] = [];
						dataPerBulan[key].push({
							Nama: c.nama,
							// API returns snake_case usually but cacheService might map it?
							// Actually API returns camelCase in api.ts types.
							// But need to ensure backend saves it correctly. 
							// Backend INSERT uses snake_case, but SELECT usually returns snake_case unless aliased.
							"Jenis Klien": c.jenis_klien || c.jenisKlien,
							Layanan: c.layanan,
							Kategori: c.kategori,
						});
					});
					const bulanList = Object.keys(dataPerBulan);
					setDataPerBulan(dataPerBulan);
					setBulanList(bulanList);
					if (bulanList.length > 0) setBulanDipilih(bulanList[0]);
				}
			} catch (err) {
				console.error("Failed to load customers:", err);
			}
		})();
	}, []);

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setFileName(file.name);

			// Create upload session for tracking
			let session;
			createUploadSession(file, 'customers').then(s => {
				session = s;
				console.log('Created upload session for customers:', session);
			}).catch(error => {
				console.error('Failed to create upload session:', error);
			});

			const reader = new FileReader();
			reader.onload = async (evt) => {
				const data = evt.target?.result;
				if (!data) return;

				// Check file type and process accordingly
				const fileExtension = file.name.toLowerCase().split(".").pop();

				if (fileExtension === "csv") {
					// Parse CSV file with Papa Parse
					Papa.parse(data as string, {
						header: true,
						skipEmptyLines: true,
						complete: async (results) => {
							const dataBulan: { [bulan: string]: any[] } = {};

							// For CSV, we treat the entire file as one sheet
							const json: any[] = results.data as any[];

							// Ambil hanya kolom yang diinginkan
							const filtered = json.map((row) => {
								const obj: any = {};
								for (const h of CUSTOMER_HEADERS) obj[h] = row[h] || "";
								return obj;
							});

							// Validasi header untuk CSV
							const headers = Object.keys(json[0] || {});
							const missing = CUSTOMER_HEADERS.filter(
								(h) => !headers.includes(h),
							);
							if (missing.length > 0) {
								setError(
									`File header tidak sesuai. Kolom wajib: ${CUSTOMER_HEADERS.join(", ")}`,
								);
								setDataPerBulan({});
								setBulanList([]);
								setBulanDipilih("");
								return;
							}

							// For CSV, use filename as sheet name
							const sheetName = file.name.replace(/\.[^/.]+$/, "") || "Data";
							dataBulan[sheetName] = filtered;

							setError(null);
							setDataPerBulan(dataBulan);
							setBulanList([sheetName]);
							setBulanDipilih(sheetName);

							// SIMPAN KE INDEXEDDB
							const allCustomers: any[] = [];
							[sheetName].forEach((bulan) => {
								dataBulan[bulan].forEach((row: any, idx: number) => {
									allCustomers.push({
										id: `${bulan}-${idx}-${row["Nama"]}`,
										nama: row["Nama"],
										jenisKlien: row["Jenis Klien"],
										layanan: row["Layanan"],
										kategori: row["Kategori"],
									});
								});
							});
							await db.customers.clear();
							// Add upload session metadata to customers
							const enrichedCustomers = allCustomers.map(customer => ({
								...customer,
								uploadTimestamp: session ? session.uploadTimestamp : Date.now(),
								fileName: file.name,
								fileHash: session ? session.fileHash : null,
								batchId: session ? session.id : null,
								uploadSessionId: session ? session.id : null
							}));

							// SIMPAN KE MYSQL via API
							try {
								await customerAPI.bulkInsertCustomers(enrichedCustomers, {
									batchId: session?.id,
									fileName: file.name
								});

								// Invalidate cache so fresh data is fetched next time
								await cacheService.invalidateCustomers();

								// Update local cache optionally (or just rely on refetch)
								await db.customers.clear();
								await db.customers.bulkAdd(enrichedCustomers);

								// Finalize upload session
								if (session) {
									await finalizeUploadSession(session.id, {
										status: 'completed',
										recordCount: enrichedCustomers.length,
										successCount: enrichedCustomers.length,
										errorCount: 0
									});
								}
								alert("Data customer berhasil disimpan ke Server MySQL.");
							} catch (err) {
								console.error("Failed to upload customers to server:", err);
								alert("Gagal menyimpan data ke server. Cek console log.");
							}
						},
						error: (error) => {
							logger.error("Papa Parse error:", error);
							setError("Failed to parse CSV file. Please check file format.");
						},
					});
				} else if (fileExtension === "xlsx" || fileExtension === "xls") {
					// Parse Excel file with ExcelJS (secure alternative)
					try {
						const workbook = new ExcelJS.Workbook();
						await workbook.xlsx.load(data as ArrayBuffer);

						const dataBulan: { [bulan: string]: any[] } = {};
						let valid = true;

						// Process each worksheet
						for (const worksheet of workbook.worksheets) {
							const sheetName = worksheet.name;
							const json: any[] = [];

							// Convert worksheet to JSON
							worksheet.eachRow((row, rowNumber) => {
								if (rowNumber === 1) return; // Skip header row

								const rowData: any = {};
								row.eachCell((cell, colNumber) => {
									const header = CUSTOMER_HEADERS[colNumber - 1];
									if (header) {
										rowData[header] = cell.value?.toString() || "";
									}
								});

								if (Object.values(rowData).some((val) => val !== "")) {
									json.push(rowData);
								}
							});

							// Validasi header
							const headers = CUSTOMER_HEADERS;
							const missing = CUSTOMER_HEADERS.filter(
								(h) => !headers.includes(h),
							);
							if (missing.length > 0) {
								setError(
									`Sheet '${sheetName}' header tidak sesuai. Kolom wajib: ${CUSTOMER_HEADERS.join(", ")}`,
								);
								setDataPerBulan({});
								setBulanList([]);
								setBulanDipilih("");
								valid = false;
								break;
							}

							dataBulan[sheetName] = json;
						}

						if (valid) {
							setError(null);
							setDataPerBulan(dataBulan);
							setBulanList(Object.keys(dataBulan));
							setBulanDipilih(Object.keys(dataBulan)[0] || "");

							// SIMPAN KE MYSQL via API
							const allCustomers: any[] = [];
							Object.keys(dataBulan).forEach((bulan) => {
								dataBulan[bulan].forEach((row: any, idx: number) => {
									allCustomers.push({
										id: `${bulan}-${idx}-${row["Nama"]}`,
										nama: row["Nama"],
										jenisKlien: row["Jenis Klien"],
										layanan: row["Layanan"],
										kategori: row["Kategori"],
									});
								});
							});

							if (allCustomers.length > 0) {
								const enrichedCustomers = allCustomers.map(customer => ({
									...customer,
									uploadTimestamp: session ? session.uploadTimestamp : Date.now(),
									fileName: file.name,
									fileHash: session ? session.fileHash : null,
									batchId: session ? session.id : null,
									uploadSessionId: session ? session.id : null
								}));

								try {
									await customerAPI.bulkInsertCustomers(enrichedCustomers, {
										batchId: session?.id,
										fileName: file.name
									});

									await cacheService.invalidateCustomers();

									await db.customers.clear();
									await db.customers.bulkAdd(enrichedCustomers); // Keep local sync

									if (session) {
										await finalizeUploadSession(session.id, {
											status: 'completed',
											recordCount: enrichedCustomers.length,
											successCount: enrichedCustomers.length,
											errorCount: 0
										});
									}
									alert("Data customer berhasil disimpan ke Server MySQL.");
								} catch (err) {
									console.error("Server upload failed:", err);
									alert("Gagal menyimpan ke server.");
								}
							}
						}
					} catch (error) {
						logger.error("Excel parsing error:", error);
						setError("Failed to parse Excel file. Please check file format.");
					}
				} else {
					setError(
						"File format tidak didukung. Gunakan file CSV atau Excel (.xlsx, .xls)",
					);
				}
			};
			reader.readAsArrayBuffer(file); // Read as ArrayBuffer for both CSV and Excel
		} else {
			setFileName("");
		}
	};

	// Tambahkan handler clear cache dan clear data
	const handleClearCache = async () => {
		if (window.confirm("Yakin ingin menghapus cache customer di IndexedDB?")) {
			await db.customers.clear();
			alert("Cache customer di IndexedDB berhasil dihapus.");
		}
	};
	const handleClearData = () => {
		if (
			window.confirm(
				"Yakin ingin menghapus seluruh data customer yang di-upload?",
			)
		) {
			setDataPerBulan({});
			setBulanList([]);
			setBulanDipilih("");
			setError(null);
		}
	};

	// Urutan bulan Indonesia
	const MONTH_ORDER_ID = [
		"Januari",
		"Februari",
		"Maret",
		"April",
		"Mei",
		"Juni",
		"Juli",
		"Agustus",
		"September",
		"Oktober",
		"November",
		"Desember",
	];

	return (
		<PageWrapper maxW="4xl">
			{/* Summary Cards - Full Width, Modern Layout */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 w-full">
				<SummaryCard
					icon={
						<TableChartIcon
							sx={{
								fontSize: 28,
								color: "#fff",
								filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.10))",
							}}
						/>
					}
					title={`Total Customer Bulan ${bulanDipilih}`}
					value={paginatedCustomers.total}
					description={`Jumlah customer pada bulan ${bulanDipilih}`}
					iconBg="bg-blue-700"
					className="w-full"
				/>
				{bulanList.length > 1 && (
					<SummaryCard
						icon={
							<TableChartIcon
								sx={{
									fontSize: 28,
									color: "#fff",
									filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.10))",
								}}
							/>
						}
						title="Total Customer Semua Bulan"
						value={bulanList.reduce(
							(acc, b) => acc + (dataPerBulan[b]?.length || 0),
							0,
						)}
						description="Jumlah customer dari seluruh bulan di file ini"
						iconBg="bg-green-600"
						className="w-full"
					/>
				)}
			</div>
			{/* Filter & Upload Card - Full Width, Modern Layout */}
			<Card className="w-full mb-8 min-h-[100px]">
				<CardContent className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center w-full">
						{/* File Upload */}
						<div className="flex flex-col w-full">
							<label className="block text-xs font-semibold mb-1">
								Choose File
							</label>
							<div className="relative w-full">
								<input
									id="customer-upload"
									type="file"
									accept=".xlsx,.xls"
									onChange={handleFileUpload}
									className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
								/>
								<label
									htmlFor="customer-upload"
									className="flex items-center rounded-lg bg-gray-50 px-3 py-2 h-10 cursor-pointer text-xs font-normal w-full transition focus-within:ring-2 focus-within:ring-blue-200"
								>
									<span className="text-blue-600 font-semibold mr-2">
										Choose File
									</span>
									<span className="truncate text-gray-500">
										{fileName || "No file chosen"}
									</span>
								</label>
							</div>
							{error && (
								<div className="text-red-500 mt-2 text-xs">{error}</div>
							)}
						</div>
						{/* Dropdown Bulan */}
						<div className="flex flex-col w-full">
							<label className="block text-xs font-semibold mb-1">Bulan</label>
							{bulanList.length > 0 && (
								<select
									value={bulanDipilih}
									onChange={(e) => setBulanDipilih(e.target.value)}
									className="rounded-lg px-3 py-2 w-full text-xs h-10 bg-gray-50 focus:ring-2 focus:ring-blue-200 transition"
								>
									{bulanList
										.slice()
										.sort(
											(a, b) =>
												MONTH_ORDER_ID.indexOf(a) - MONTH_ORDER_ID.indexOf(b),
										)
										.map((bulan) => (
											<option key={bulan} value={bulan}>
												{bulan}
											</option>
										))}
								</select>
							)}
						</div>
						{/* Dropdown Jenis Klien */}
						<div className="flex flex-col w-full">
							<label className="block text-xs font-semibold mb-1">
								Jenis Klien
							</label>
							{jenisKlienList.length > 0 && (
								<select
									value={jenisKlienFilter}
									onChange={(e) => setJenisKlienFilter(e.target.value)}
									className="rounded-lg px-3 py-2 w-full text-xs h-10 bg-gray-50 focus:ring-2 focus:ring-blue-200 transition"
								>
									<option value="ALL">Semua Jenis Klien</option>
									{jenisKlienList.map((jk) => (
										<option key={jk} value={jk}>
											{jk}
										</option>
									))}
								</select>
							)}
						</div>
						{/* Search Input */}
						<div className="flex flex-col w-full">
							<label className="block text-xs font-semibold mb-1">
								Search
							</label>
							<div className="relative">
								<SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => {
										setSearchQuery(e.target.value);
										setPage(1); // Reset to first page when searching
									}}
									placeholder="Search customer data..."
									className="rounded-lg pl-10 pr-10 py-2 w-full text-xs h-10 bg-gray-50 focus:ring-2 focus:ring-blue-200 transition border border-gray-200 dark:border-gray-700"
								/>
								{searchQuery && (
									<button
										onClick={() => {
											setSearchQuery("");
											setPage(1);
										}}
										className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
									>
										×
									</button>
								)}
							</div>
						</div>
						{/* Tombol Action */}
						<div className="flex flex-col w-full items-end justify-center gap-2">
							<button
								onClick={() => setShowDeleteDialog(true)}
								className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold text-xs hover:bg-orange-700 transition"
								type="button"
							>
								Delete by File
							</button>
							<button
								onClick={() => {
									handleClearCache();
									handleClearData();
								}}
								className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition"
								type="button"
							>
								Clear All Data
							</button>
						</div>
					</div>
				</CardContent>
			</Card>
			<div className="overflow-x-auto rounded-xl shadow-lg bg-card text-card-foreground">
				<Table>
					<TableHeader>
						<TableRow>
							{CUSTOMER_HEADERS.map((h) => (
								<TableHead key={h}>{h}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedCustomers.data.length > 0 ? (
							paginatedCustomers.data.map((row, i) => (
								<TableRow key={i}>
									{CUSTOMER_HEADERS.map((h) => (
										<TableCell key={h}>{row[h]}</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={CUSTOMER_HEADERS.length}
									className="text-center py-8 text-gray-400"
								>
									Belum ada data
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination Controls */}
			{paginatedCustomers.total > pageSize && (
				<div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700">
					<PaginationControls
						page={page}
						pageSize={pageSize}
						totalPages={paginationTotalPages ?? 1}
						onPageChange={setPage}
						onPageSizeChange={setPageSize}
						pageSizes={[25, 50, 100, 200]}
					/>
				</div>
			)}
			{showDeleteDialog && (
				<DeleteByFileDialog
					dataType="customers"
					onClose={() => setShowDeleteDialog(false)}
					onDeleted={({ fileName, deletedCount }) => {
						alert(`Terhapus ${deletedCount} data customer dari ${fileName}`);
						// Refresh data
						setDataPerBulan({});
						setBulanList([]);
						setBulanDipilih("");
					}}
				/>
			)}
		</PageWrapper>
	);
};

export default CustomerData;

// --- [AUTO-ADDED] Delete-by-File integration (Customers) ---
// import { createUploadSession, finalizeUploadSession } from '../services/uploadSessions';
// import DeleteByFileDialog from '../components/DeleteByFileDialog';
// const [showDeleteDialog, setShowDeleteDialog] = useState(false);
//
// async function handleUploadCustomer_withSession(file: File) {
//   const session = await createUploadSession(file, 'customers');
//   try {
//     const parsed: any[] = await parseCustomers(file); // gunakan parser kamu
//     const stamp = Date.now();
//     const enriched = parsed.map(r => ({ ...r, uploadTimestamp: stamp, fileName: file.name, fileHash: session.fileHash, batchId: session.id, uploadSessionId: session.id }));
//     await db.customers.bulkPut(enriched as any);
//     await finalizeUploadSession(session.id, { status: 'completed', recordCount: enriched.length, successCount: enriched.length });
//   } catch (e: any) {
//     await finalizeUploadSession(session.id, { status: 'failed', errorCount: 1, errorLog: [String(e?.message || e)] });
//   }
// }
//
// {/* Tambahkan tombol di toolbar */}
// {/* <button onClick={() => setShowDeleteDialog(true)} className="btn btn-outline">Delete by File</button> */}
// {/* {showDeleteDialog && <DeleteByFileDialog dataType="customers" onClose={() => setShowDeleteDialog(false)} onDeleted={({fileName, deletedCount}) => toast.success(`Terhapus ${deletedCount} data customer dari ${fileName}`)} />} */}
// --- [END AUTO-ADDED] ---
