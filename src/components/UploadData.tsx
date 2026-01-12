import React, { useState, useCallback, useEffect } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import Papa from "papaparse";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { db, ITicket } from "@/lib/db";
import { ticketAPI } from "@/lib/api";
import { cacheService } from "@/services/cacheService";
import { formatDurationDHM } from "@/lib/utils";
import SummaryCard from "./ui/SummaryCard";
import { useLiveQuery } from "dexie-react-hooks";
import DeleteByFileDialog from "./DeleteByFileDialog";
import { createUploadSession, finalizeUploadSession } from '../services/uploadSessions';
// import SecurityNotice from './SecurityNotice'; // Temporarily disabled for Excel support
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TableChartIcon from "@mui/icons-material/TableChart";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import StorageIcon from "@mui/icons-material/Storage";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PageWrapper from "./PageWrapper";
import { logger } from "@/lib/logger";

type UploadProcessProps = {
	onUploadComplete: () => void;
};

interface IErrorLog {
	row: number;
	reason: string;
}

interface IUploadSummary {
	totalRows: number;
	successCount: number;
	errorCount: number;
	zeroDurationCount: number;
}

// Define expected headers for validation and template generation
const EXPECTED_HEADERS = [
	"Customer ID",
	"Nama",
	"Kategori",
	"Deskripsi",
	"Penyebab",
	"Penanganan",
	"Waktu Open",
	"Waktu Close Tiket",
	"Durasi",
	"Close Penanganan",
	"Durasi Penanganan",
	"Klasifikasi",
	"Sub Klasifikasi",
	"Status",
	"Cabang",
	"Penanganan 1",
	"Close Penanganan 1",
	"Durasi Penanganan 1",
	"Penanganan 2",
	"Close Penanganan 2",
	"Durasi Penanganan 2",
	"Penanganan 3",
	"Close Penanganan 3",
	"Durasi Penanganan 3",
	"Penanganan 4",
	"Close Penanganan 4",
	"Durasi Penanganan 4",
	"Penanganan 5",
	"Close Penanganan 5",
	"Durasi Penanganan 5",
	"Open By",
];

const UploadData = ({ onUploadComplete }: UploadProcessProps) => {
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);

	const [uploadSummary, setUploadSummary] = useState<IUploadSummary | null>(
		null,
	);
	const [errorLog, setErrorLog] = useState<IErrorLog[]>([]);
	const [useBackendParser, setUseBackendParser] = useState(true);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	// Ambil jumlah tiket di database (GridView)
	const ticketsInDb = useLiveQuery(() => db.tickets.count(), []);

	useEffect(() => {
		try {
			const storedSummary = localStorage.getItem("uploadSummary");
			if (storedSummary) setUploadSummary(JSON.parse(storedSummary));

			const storedErrorLog = localStorage.getItem("uploadErrorLog");
			if (storedErrorLog) setErrorLog(JSON.parse(storedErrorLog));
		} catch (error) {
			logger.error("Failed to parse data from localStorage", error);
			localStorage.removeItem("uploadSummary");
			localStorage.removeItem("uploadErrorLog");
		}
	}, []);

	useEffect(() => {
		if (uploadSummary) {
			localStorage.setItem("uploadSummary", JSON.stringify(uploadSummary));
		} else {
			localStorage.removeItem("uploadSummary");
		}
	}, [uploadSummary]);

	useEffect(() => {
		if (errorLog && errorLog.length > 0) {
			localStorage.setItem("uploadErrorLog", JSON.stringify(errorLog));
		} else {
			localStorage.removeItem("uploadErrorLog");
		}
	}, [errorLog]);

	const handleFileUpload = async (file: File) => {
		if (!file) return;

		setIsProcessing(true);
		setProgress(0);

		// Create upload session for tracking
		let session;
		try {
			session = await createUploadSession(file, 'tickets');
		} catch (error) {
			console.error('Failed to create upload session:', error);
		}

		try {
			const data = await file.arrayBuffer();
			const fileExtension = file.name.toLowerCase().split(".").pop();

			let json: any[] = [];
			let fileHeaders: string[] = [];

			if (fileExtension === "csv") {
				// Parse CSV with Papa Parse
				const text = new TextDecoder().decode(data);
				return new Promise<void>((resolve, reject) => {
					Papa.parse(text, {
						header: true,
						skipEmptyLines: true,
						complete: async (results) => {
							try {
								json = results.data as any[];
								fileHeaders = Object.keys(json[0] || {});
								await processUploadedData(json, fileHeaders, session, file);
								resolve();
							} catch (error) {
								reject(error);
							}
						},
						error: (error) => {
							reject(new Error(`CSV parsing error: ${error.message}`));
						},
					});
				});
			} else if (fileExtension === "xlsx" || fileExtension === "xls") {
				// Parse Excel with ExcelJS
				const workbook = new ExcelJS.Workbook();
				await workbook.xlsx.load(data);

				const worksheet = workbook.getWorksheet(1); // Get first worksheet
				if (!worksheet) {
					throw new Error("No worksheet found in Excel file");
				}

				// Convert worksheet to JSON
				const headers: string[] = [];
				const rows: any[] = [];

				worksheet.eachRow((row, rowNumber) => {
					if (rowNumber === 1) {
						// Get headers from first row
						row.eachCell((cell, colNumber) => {
							const headerValue = cell.value?.toString()?.trim() || "";
							headers[colNumber - 1] = headerValue;
						});
					} else {
						// Get data rows
						const rowData: any = {};
						row.eachCell((cell, colNumber) => {
							const header = headers[colNumber - 1];
							if (header) {
								rowData[header] = cell.value?.toString() || "";
							}
						});
						if (Object.values(rowData).some((val) => val !== "")) {
							rows.push(rowData);
						}
					}
				});

				json = rows;
				fileHeaders = headers.filter((h) => h !== "");

				await processUploadedData(json, fileHeaders, session, file);
			} else {
				throw new Error(
					"Unsupported file format. Please use CSV or Excel files.",
				);
			}
		} catch (error) {
			logger.error("Error processing file:", error);

			// Finalize upload session with error status
			if (session) {
				try {
					await finalizeUploadSession(session.id, {
						status: 'failed',
						errorCount: 1,
						errorLog: [String(error instanceof Error ? error.message : error)]
					});
				} catch (finalizeError) {
					console.error('Failed to finalize upload session:', finalizeError);
				}
			}

			alert(
				`Error processing file: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setIsProcessing(false);
			setProgress(100);
		}
	};

	const processUploadedData = async (json: any[], fileHeaders: string[], session: any, file: File) => {
		// Debug: Log detected headers
		logger.info("Detected Headers:", fileHeaders);
		logger.info("Expected Headers:", EXPECTED_HEADERS);

		// Header validation with detailed feedback
		const missingHeaders = EXPECTED_HEADERS.filter(
			(h) => !fileHeaders.includes(h),
		);
		if (missingHeaders.length > 0) {
			const errorMessage = `File header tidak sesuai!\n\nKolom yang hilang:\n${missingHeaders.join(", ")}\n\nKolom yang terdeteksi:\n${fileHeaders.join(", ")}\n\nKolom yang diperlukan:\n${EXPECTED_HEADERS.join(", ")}\n\nSilakan download template untuk format yang benar.`;
			logger.error("Header Tidak Sesuai", {
				missingHeaders,
				fileHeaders,
				expectedHeaders: EXPECTED_HEADERS,
			});
			alert(errorMessage);
			return;
		}

		const { tickets: processedTickets, errorRows } =
			processAndAnalyzeData(json);

		if (processedTickets.length > 0) {
			// Add upload session metadata to tickets
			const enrichedTickets = processedTickets.map(ticket => ({
				...ticket,
				uploadTimestamp: session ? session.uploadTimestamp : Date.now(),
				fileName: file.name,
				fileHash: session ? session.fileHash : null,
				batchId: session ? session.id : null,
				uploadSessionId: session ? session.id : null
			}));

			// Send to backend API (MySQL)
			await ticketAPI.bulkInsertTickets(enrichedTickets, {
				batchId: session?.id,
				fileName: file.name,
				uploadTimestamp: session?.uploadTimestamp || Date.now()
			});

			// Invalidate cache so fresh data is fetched next time
			await cacheService.invalidateTickets();

			// Optional: Update local cache immediately for better UX
			// await db.tickets.bulkPut(enrichedTickets);

			// Finalize upload session
			if (session) {
				await finalizeUploadSession(session.id, {
					status: 'completed',
					recordCount: enrichedTickets.length,
					successCount: enrichedTickets.length,
					errorCount: errorRows.length
				});
			}
		}

		const successCount = processedTickets.length;
		const errorCount = errorRows.length;
		const totalRowsInFile = json.length;
		const zeroDurationCount = processedTickets.filter(
			(t) => t.duration?.rawHours === 0 || t.handlingDuration?.rawHours === 0,
		).length;

		const summary: IUploadSummary = {
			totalRows: totalRowsInFile,
			successCount,
			errorCount,
			zeroDurationCount,
		};
		setUploadSummary(summary);
		setErrorLog(errorRows);

		if (errorCount > 0) {
			logger.warn(`Terdapat ${errorCount} Kegagalan`, { errorRows });
		}
		if (zeroDurationCount > 0) {
			logger.warn(
				`${zeroDurationCount} tiket memiliki durasi 0 jam. Periksa kembali kolom waktu di file Excel.`,
			);
		}

		onUploadComplete();
	};

	const handleReset = async () => {
		// Confirmation dialog
		if (!window.confirm("⚠️ PERINGATAN: Semua data tiket akan dihapus PERMANEN dari server dan lokal!\n\nApakah Anda yakin ingin melanjutkan?")) {
			return; // User cancelled
		}

		try {
			// Menggunakan service untuk menghapus data di Server API & IndexedDB
			await import("../services/uploadSessions").then(m => m.deleteAllData("tickets"));

			setUploadSummary(null);
			setErrorLog([]);
			logger.info("Cache & Database Dihapus");
			onUploadComplete();

			// Success feedback
			alert("✅ BERHASIL: Semua data tiket telah dihapus dari server dan lokal!");
		} catch (error) {
			logger.error("Error clearing database:", error);
			alert(`❌ GAGAL: ${error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus data'}`);
		}
	};

	const handleDownloadTemplate = async () => {
		try {
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Template Data Tiket");

			// Add headers with styling
			const headerRow = worksheet.addRow(EXPECTED_HEADERS);
			headerRow.font = { bold: true };
			headerRow.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFE0E0E0" },
			};

			// Add sample data row (empty for template)
			const sampleRow = EXPECTED_HEADERS.map(() => "");
			worksheet.addRow(sampleRow);

			// Auto-fit columns
			worksheet.columns.forEach((column) => {
				column.width = 15;
			});

			// Generate Excel file
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			saveAs(blob, "Template_Upload_Tiket.xlsx");

			logger.info("Template Diunduh dengan headers:", EXPECTED_HEADERS);
			alert(
				"Template berhasil diunduh! Silakan isi data sesuai format template.",
			);
		} catch (error) {
			logger.error("Error generating template:", error);
			alert("Error generating template. Please try again.");
		}
	};

	return (
		<PageWrapper maxW="4xl">
			<div className="flex flex-col gap-8">
				<div className="flex flex-col gap-6">
					<div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-zinc-800/50 border border-blue-200 dark:border-zinc-700">
						<div className="flex items-center space-x-3">
							<StorageIcon className="h-6 w-6 text-blue-500" />
							<Label
								htmlFor="backend-parser"
								className="font-semibold text-blue-800 dark:text-blue-300 text-base"
							>
								Automatic Parser
							</Label>
						</div>
						<input
							type="checkbox"
							id="backend-parser"
							checked={useBackendParser}
							onChange={(e) => setUseBackendParser(e.target.checked)}
						/>
					</div>
					<FileDropZone
						onFileUpload={handleFileUpload}
						isProcessing={isProcessing}
						progress={progress}
					/>
					<div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6">
						<Button
							onClick={handleDownloadTemplate}
							variant="outline"
							className="w-full sm:w-auto text-base"
						>
							<DownloadIcon className="h-4 w-4 mr-2" />
							Download Template
						</Button>
						<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
							<Button
								onClick={() => setShowDeleteDialog(true)}
								variant="outline"
								className="w-full sm:w-auto text-base"
							>
								<DeleteIcon className="h-4 w-4 mr-2" />
								Delete by File
							</Button>
							<Button
								onClick={handleReset}
								variant="destructive"
								className="w-full sm:w-auto text-base"
							>
								<DeleteIcon className="h-4 w-4 mr-2" />
								Reset Database
							</Button>
						</div>
					</div>
				</div>
				{uploadSummary ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
						<SummaryCard
							icon={<CloudUploadIcon className="w-5 h-5 text-white" />}
							title="Total Uploaded"
							value={uploadSummary.totalRows}
							description="Total rows in file"
							iconBg="bg-blue-700"
						/>
						<SummaryCard
							icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
							title="Success"
							value={uploadSummary.successCount}
							description="Valid tickets uploaded"
							iconBg="bg-green-600"
						/>
						<SummaryCard
							icon={<CloseIcon className="w-5 h-5 text-white" />}
							title="Failed"
							value={uploadSummary.errorCount}
							description="Failed rows"
							iconBg="bg-red-600"
						/>
						<SummaryCard
							icon={<TableChartIcon className="w-5 h-5 text-white" />}
							title="Tickets in GridView"
							value={ticketsInDb ?? "-"}
							description="Tickets currently in database (GridView)"
							iconBg="bg-purple-700"
						/>
					</div>
				) : (
					<Card className="w-full max-w-6xl mx-auto shadow-md  bg-card text-card-foreground  p-10 mb-8 backdrop-blur-sm flex items-center justify-center min-h-[180px]">
						<CardHeader>
							<CardTitle className="text-gray-700 dark:text-gray-300 text-base font-bold">
								No Data Uploaded
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="mt-4 text-base text-gray-500 break-words whitespace-normal text-center">
								Upload a file to see the processing summary here.
							</p>
						</CardContent>
					</Card>
				)}
				{/* Jika jumlah successCount dan ticketsInDb berbeda, tampilkan warning */}
				{uploadSummary &&
					ticketsInDb !== undefined &&
					uploadSummary.successCount !== ticketsInDb && (
						<div className="p-4 mb-4 rounded bg-yellow-100 text-yellow-800 ">
							<b>Warning:</b> Jumlah tiket yang berhasil di-upload (
							{uploadSummary.successCount}) berbeda dengan jumlah tiket di
							GridView ({ticketsInDb}).
							<br />
							Pastikan database sudah di-reset sebelum upload baru, atau cek
							apakah ada filter aktif di GridView.
						</div>
					)}
				<ErrorLogTable errors={errorLog} />
			</div>
			{showDeleteDialog && (
				<DeleteByFileDialog
					dataType="tickets"
					onClose={() => setShowDeleteDialog(false)}
					onDeleted={({ fileName, deletedCount }) => {
						alert(`Terhapus ${deletedCount} data dari ${fileName}`);
						onUploadComplete(); // Refresh data
					}}
				/>
			)}
		</PageWrapper>
	);
};

const FileDropZone = ({
	onFileUpload,
	isProcessing,
	progress,
}: {
	onFileUpload: (file: File) => void;
	isProcessing: boolean;
	progress: number;
}) => {
	const [isDragActive, setIsDragActive] = useState(false);
	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragActive(false);
			if (e.dataTransfer.files && e.dataTransfer.files[0]) {
				onFileUpload(e.dataTransfer.files[0]);
			}
		},
		[onFileUpload],
	);
	const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			onFileUpload(e.target.files[0]);
		}
	};
	return (
		<>
			<div
				onDragEnter={(e) => {
					e.preventDefault();
					setIsDragActive(true);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					setIsDragActive(false);
				}}
				onDragOver={(e) => e.preventDefault()}
				onDrop={onDrop}
				className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragActive ? "border-blue-500 bg-blue-50 dark:bg-zinc-800" : "border-gray-300 dark:border-zinc-700 hover:border-blue-400"}`}
			>
				{isProcessing ? (
					<>
						<div
							className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin"
							style={{ borderTopColor: "#3b82f6" }}
						></div>
						<h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
							Processing File...
						</h3>
						<div className="w-full max-w-xs mt-4">
							<Progress value={progress} className="h-2" />
						</div>
					</>
				) : (
					<>
						<CloudUploadIcon className="w-10 h-10 text-gray-400" />
						<p className="mt-4 text-md text-muted-foreground">
							Drop file here, or{" "}
							<label
								htmlFor="file-upload"
								className="font-semibold text-blue-600 hover:text-blue-500 cursor-pointer"
							>
								select file
							</label>
						</p>
						<input
							id="file-upload"
							type="file"
							className="sr-only"
							onChange={onFileSelect}
							accept=".xlsx, .xls, .csv"
						/>
						<p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
							Supports .xlsx, .xls, and .csv
						</p>
					</>
				)}
			</div>
		</>
	);
};

const ErrorLogTable = ({ errors }: { errors: IErrorLog[] }) => {
	const groupedErrors = errors.reduce(
		(acc, error) => {
			const key = error.reason.replace(/: ".+"$/, "");
			if (!acc[key]) acc[key] = [];
			acc[key].push(error);
			return acc;
		},
		{} as Record<string, IErrorLog[]>,
	);

	return (
		<Card className="w-full max-w-6xl mx-auto shadow-md  bg-card text-card-foreground  p-10 mb-8 min-h-[180px] backdrop-blur-sm">
			<CardHeader className="pb-2">
				<CardTitle className="text-lg font-bold text-card-foreground text-left">
					Failure Log Details
				</CardTitle>
				<CardDescription className="text-base text-zinc-500 dark:text-zinc-400 text-left">
					Grouped by error type.
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-2 text-sm text-gray-700 dark:text-gray-200">
				<Accordion type="multiple" className="w-full">
					{Object.entries(groupedErrors).map(([reason, errs], index) => (
						<AccordionItem value={`item-${index}`} key={index}>
							<AccordionTrigger className="text-left hover:no-underline">
								<div className="flex justify-between w-full pr-4 items-center">
									<span className="font-semibold text-sm break-words whitespace-normal text-left">
										{reason}
									</span>
									<span>
										<Badge
											variant="danger"
											className="flex-shrink-0 text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200  dark:border-red-800"
										>
											{errs.length} rows
										</Badge>
									</span>
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<div className="max-h-48 overflow-y-auto pr-4 border-t pt-2 mt-2">
									<table>
										<thead>
											<tr>
												<th className="w-[100px] text-left text-xs font-semibold">
													Row #
												</th>
												<th className="text-left text-xs font-semibold">
													Full Detail
												</th>
											</tr>
										</thead>
										<tbody>
											{errs.map((err) => (
												<tr key={err.row}>
													<td className="font-medium text-left text-xs">
														{err.row}
													</td>
													<td className="text-xs text-left break-words whitespace-normal">
														{err.reason}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</CardContent>
		</Card>
	);
};

// Helper to get formatted string YYYY-MM-DD HH:mm:ss from any date-like input
// This extracts the "Face Value" assuming the input encapsulates the desired local time.
function getFaceValueString(value: any): string | undefined {
	if (value === null || value === undefined || value === "") return undefined;

	let year, month, day, hours, minutes, seconds;

	if (value instanceof Date) {
		if (isNaN(value.getTime())) return undefined;
		// Extract local components (Face Value) from the Date object
		year = value.getFullYear();
		month = value.getMonth() + 1;
		day = value.getDate();
		hours = value.getHours();
		minutes = value.getMinutes();
		seconds = value.getSeconds();
	} else if (typeof value === "number") {
		// Excel Serial Date -> JS Date (Local)
		if (value <= 0 || value >= 100000) return undefined;
		const excelEpoch = new Date(1900, 0, 1);
		const dateInMs = (value - 2) * 24 * 60 * 60 * 1000;
		const date = new Date(excelEpoch.getTime() + dateInMs);

		if (isNaN(date.getTime())) return undefined;
		year = date.getFullYear();
		month = date.getMonth() + 1;
		day = date.getDate();
		hours = date.getHours();
		minutes = date.getMinutes();
		seconds = date.getSeconds();
	} else if (typeof value === "string") {
		const trimmed = value.trim();

		// Strategy: Extract time components DIRECTLY from the string using Regex
		// This bypasses "new Date()" ambiguity and timezone shifts entirely.

		// 1. Matches "Mon Jan 01 2020 20:50:00 ..."
		const verboseMatch = trimmed.match(/\w{3}\s+\w{3}\s+\d{1,2}\s+\d{4}\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
		if (verboseMatch) {
			// Parse the DATE part as well to be safe, or assume standard structure?
			// Let's parse full structure to be safe: RegEx: Wed Jan 01 2020 ...
			const fullMatch = trimmed.match(/(\w{3})\s+(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
			if (fullMatch) {
				const monthStr = fullMatch[2];
				const months: { [key: string]: number } = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

				year = parseInt(fullMatch[4], 10);
				month = months[monthStr] || 1;
				day = parseInt(fullMatch[3], 10);
				hours = parseInt(fullMatch[5], 10);
				minutes = parseInt(fullMatch[6], 10);
				seconds = parseInt(fullMatch[7], 10);
			} else {
				// Fallback to strict regex for simpler ISO/Excel formats
				return trimmed;
			}
		} else {
			return trimmed;
		}
	} else {
		return undefined;
	}

	// Pad and format
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${year}-${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function parseExcelDate(value: any): string | undefined {
	const faceValueStr = getFaceValueString(value);
	if (!faceValueStr) return undefined;

	// Now parse strictly as UTC
	// Supported formats: YYYY-MM-DD HH:mm:ss, DD/MM/YYYY HH:mm:ss, etc.
	const formats = [
		// YYYY-MM-DD HH:mm:ss (Standard Output from helper)
		/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
		// DD/MM/YYYY HH:MM:SS
		/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
		// DD/MM/YYYY HH:MM (Supports user's new format)
		/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{1,2})$/,
		// YYYY-MM-DD HH:MM
		/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/,
		// DD/MM/YYYY
		/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
		// YYYY-MM-DD
		/^(\d{4})-(\d{1,2})-(\d{1,2})$/,
	];

	for (let i = 0; i < formats.length; i++) {
		const parts = faceValueStr.match(formats[i]);
		if (parts) {
			let year, month, day, hours = 0, minutes = 0, seconds = 0;

			// Handle format differences
			if (i === 0) { // YYYY-MM-DD HH:mm:ss
				year = parseInt(parts[1], 10);
				month = parseInt(parts[2], 10);
				day = parseInt(parts[3], 10);
				hours = parseInt(parts[4], 10);
				minutes = parseInt(parts[5], 10);
				seconds = parseInt(parts[6], 10);
			} else if (i === 1) { // DD/MM/YYYY HH:mm:ss
				day = parseInt(parts[1], 10);
				month = parseInt(parts[2], 10);
				year = parseInt(parts[3], 10);
				hours = parseInt(parts[4], 10);
				minutes = parseInt(parts[5], 10);
				seconds = parseInt(parts[6], 10);
			} else if (i === 2) { // DD/MM/YYYY HH:mm
				day = parseInt(parts[1], 10);
				month = parseInt(parts[2], 10);
				year = parseInt(parts[3], 10);
				hours = parseInt(parts[4], 10);
				minutes = parseInt(parts[5], 10);
			} else if (i === 3) { // YYYY-MM-DD HH:mm
				year = parseInt(parts[1], 10);
				month = parseInt(parts[2], 10);
				day = parseInt(parts[3], 10);
				hours = parseInt(parts[4], 10);
				minutes = parseInt(parts[5], 10);
			} else if (i === 4) { // DD/MM/YYYY
				day = parseInt(parts[1], 10);
				month = parseInt(parts[2], 10);
				year = parseInt(parts[3], 10);
			} else if (i === 5) { // YYYY-MM-DD
				year = parseInt(parts[1], 10);
				month = parseInt(parts[2], 10);
				day = parseInt(parts[3], 10);
			}

			if (year! < 100) year! += 2000;

			// Construct strictly as UTC
			try {
				const utcDate = new Date(Date.UTC(year!, month! - 1, day!, hours, minutes, seconds));
				if (!isNaN(utcDate.getTime())) {
					return utcDate.toISOString();
				}
			} catch (e) {
				// Ignore
			}
		}
	}

	return undefined;
}

const calculateDuration = (start?: string, end?: string, maxHours: number = 720): number => {
	if (!start || !end) return 0;
	const startDate = new Date(start);
	const endDate = new Date(end);
	if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;

	const diffMs = endDate.getTime() - startDate.getTime();
	const diffHours = diffMs / (1000 * 60 * 60);

	// Return 0 for negative durations (data invalid)
	if (diffHours < 0) return 0;

	// Cap at maximum to prevent data quality issues
	if (diffHours > maxHours) {
		logger.warn(`[DURATION] Capping duration from ${diffHours.toFixed(2)} to ${maxHours} hours (${start} -> ${end})`);
		return maxHours;
	}

	return diffHours;
};

const processAndAnalyzeData = (
	rawData: any[],
): { tickets: ITicket[]; errorRows: IErrorLog[] } => {
	const tickets: ITicket[] = [];
	const errorRows: IErrorLog[] = [];
	const uploadTimestamp = Date.now();

	// Log sample data untuk debugging
	logger.info(`[DEBUG] Processing ${rawData.length} rows`);
	if (rawData.length > 0) {
		logger.info(`[DEBUG] Sample row 1:`, rawData[0]);
		logger.info(`[DEBUG] Sample row 1 keys:`, Object.keys(rawData[0]));
		if (rawData.length > 1) {
			logger.info(`[DEBUG] Sample row 2:`, rawData[1]);
		}
	}

	rawData.forEach((row, index) => {
		if (Object.keys(row).length === 0) {
			return;
		}

		// Log first 5 rows untuk debugging
		if (index < 5) {
			logger.info(`[DEBUG] Processing row ${index + 2}:`, row);
		}
		const customerId = row["Customer ID"];
		const openTimeValue = row["Waktu Open"];
		const openBy = row["Open By"];

		// Log field values untuk debugging
		if (index < 5) {
			logger.info(
				`[DEBUG] Row ${index + 2} - Customer ID:`,
				customerId,
				`(Type: ${typeof customerId})`,
			);
			logger.info(
				`[DEBUG] Row ${index + 2} - Waktu Open:`,
				openTimeValue,
				`(Type: ${typeof openTimeValue})`,
			);
			logger.info(
				`[DEBUG] Row ${index + 2} - Open By:`,
				openBy,
				`(Type: ${typeof openBy})`,
			);
		}

		// Validasi field wajib - handle various data types and empty values
		if (
			customerId === null ||
			customerId === undefined ||
			(typeof customerId === "string" && customerId.trim() === "") ||
			(typeof customerId === "number" && isNaN(customerId))
		) {
			errorRows.push({
				row: index + 2,
				reason: `Customer ID kosong atau tidak valid: "${customerId}" (Type: ${typeof customerId})`,
			});
			if (index < 5)
				logger.info(`[DEBUG] Row ${index + 2} FAILED: Customer ID validation`);
			return;
		}

		if (
			openTimeValue === null ||
			openTimeValue === undefined ||
			(typeof openTimeValue === "string" && openTimeValue.trim() === "")
		) {
			errorRows.push({
				row: index + 2,
				reason: `Waktu Open kosong atau tidak valid: "${openTimeValue}" (Type: ${typeof openTimeValue})`,
			});
			if (index < 5)
				logger.info(`[DEBUG] Row ${index + 2} FAILED: Waktu Open validation`);
			return;
		}

		if (
			openBy === null ||
			openBy === undefined ||
			(typeof openBy === "string" && openBy.trim() === "")
		) {
			errorRows.push({
				row: index + 2,
				reason: `Open By kosong atau tidak valid: "${openBy}" (Type: ${typeof openBy})`,
			});
			if (index < 5)
				logger.info(`[DEBUG] Row ${index + 2} FAILED: Open By validation`);
			return;
		}

		const openTimeIso = parseExcelDate(openTimeValue);
		if (!openTimeIso) {
			errorRows.push({
				row: index + 2,
				reason: `Format Waktu Open tidak valid: "${openTimeValue}" (Type: ${typeof openTimeValue})`,
			});
			if (index < 5)
				logger.info(
					`[DEBUG] Row ${index + 2} FAILED: Date parsing for "${openTimeValue}"`,
				);
			return;
		}

		if (index < 5) {
			logger.info(
				`[DEBUG] Row ${index + 2} SUCCESS: All validations passed, parsed date:`,
				openTimeIso,
			);
		}
		// Normalisasi ke format tanpa timezone (YYYY-MM-DDTHH:mm:ss)
		const openTime = openTimeIso.slice(0, 19);
		// Logging validasi waktu dan shift
		if (typeof window !== "undefined") {
			const d = new Date(openTimeIso);
			const jam = d.getUTCHours();
			const menit = d.getUTCMinutes();
			// Gunakan getShift dari TicketAnalytics jika perlu, atau duplikat logika di sini
			logger.info(
				`[UPLOAD] Row ${index + 2} openTime: ${openTimeValue} | parsed: ${openTime} | jam: ${jam} | menit: ${menit}`,
			);
		}

		const closeTime = parseExcelDate(row["Waktu Close Ticket"] || row["Waktu Close Tiket"]);
		const closeHandling = parseExcelDate(row["Close Penanganan"]);
		const closeHandling1 = parseExcelDate(row["Close Penanganan 1"]);
		const closeHandling2 = parseExcelDate(row["Close Penanganan 2"]);
		const closeHandling3 = parseExcelDate(row["Close Penanganan 3"]);
		const closeHandling4 = parseExcelDate(row["Close Penanganan 4"]);
		const closeHandling5 = parseExcelDate(row["Close Penanganan 5"]);

		// Calculate durations (always calculate as per user request)
		const durationHours = calculateDuration(openTime, closeTime, 720); // Max 30 days for total duration
		const handlingDurationHours = calculateDuration(openTime, closeHandling, 720); // Max 30 days for ART
		const handlingDuration1Hours = calculateDuration(openTime, closeHandling1, 72); // Max 3 days for FRT
		const handlingDuration2Hours = calculateDuration(
			closeHandling1,
			closeHandling2,
			168, // Max 7 days per handling step
		);
		const handlingDuration3Hours = calculateDuration(
			closeHandling2,
			closeHandling3,
			168,
		);
		const handlingDuration4Hours = calculateDuration(
			closeHandling3,
			closeHandling4,
			168,
		);
		const handlingDuration5Hours = calculateDuration(
			closeHandling4,
			closeHandling5,
			168,
		);

		const statusRaw = row["Status"];
		let status = "Open";
		if (statusRaw && String(statusRaw).trim()) {
			const normalized = String(statusRaw).trim().toLowerCase();
			status =
				normalized === "close ticket" ? "Closed" : String(statusRaw).trim();
		}

		const ticket: ITicket = {
			id: crypto.randomUUID(),
			customerId: customerId,
			name: row["Site Name"] || row["Nama Site"] || row["Nama"] || row["Nama Pelanggan"] || "",
			category: row["Kategori"] || "",
			description: row["Deskripsi"] || "",
			cause: row["Penyebab"] || "",
			handling: row["Penanganan"] || "",
			openTime: openTime,
			closeTime: closeTime,
			duration: {
				rawHours: durationHours,
				formatted: formatDurationDHM(durationHours),
			},
			closeHandling: closeHandling,
			handlingDuration: {
				rawHours: handlingDurationHours,
				formatted: formatDurationDHM(handlingDurationHours),
			},
			classification: row["Klasifikasi"],
			subClassification: row["Sub Klasifikasi"],
			status: status,
			cabang: row["Cabang"],
			handling1: row["Penanganan 1"],
			closeHandling1: closeHandling1,
			handlingDuration1: {
				rawHours: handlingDuration1Hours,
				formatted: formatDurationDHM(handlingDuration1Hours),
			},
			handling2: row["Penanganan 2"],
			closeHandling2: closeHandling2,
			handlingDuration2: {
				rawHours: handlingDuration2Hours,
				formatted: formatDurationDHM(handlingDuration2Hours),
			},
			handling3: row["Penanganan 3"],
			closeHandling3: closeHandling3,
			handlingDuration3: {
				rawHours: handlingDuration3Hours,
				formatted: formatDurationDHM(handlingDuration3Hours),
			},
			handling4: row["Penanganan 4"],
			closeHandling4: closeHandling4,
			handlingDuration4: {
				rawHours: handlingDuration4Hours,
				formatted: formatDurationDHM(handlingDuration4Hours),
			},
			handling5: row["Penanganan 5"],
			closeHandling5: closeHandling5,
			handlingDuration5: {
				rawHours: handlingDuration5Hours,
				formatted: formatDurationDHM(handlingDuration5Hours),
			},
			openBy: String(openBy),
			uploadTimestamp: uploadTimestamp,
		};
		tickets.push(ticket);
	});

	// Log error summary untuk debugging
	if (errorRows.length > 0) {
		const errorTypes = {};
		errorRows.forEach((err) => {
			const type = err.reason.split(":")[0] || err.reason;
			errorTypes[type] = (errorTypes[type] || 0) + 1;
		});
		logger.info(`[DEBUG] Error Summary:`, errorTypes);
		logger.info(`[DEBUG] Sample errors (first 10):`, errorRows.slice(0, 10));
	}

	logger.info(
		`[DEBUG] Processing complete: ${tickets.length} success, ${errorRows.length} errors`,
	);
	return { tickets, errorRows };
};

export default UploadData;

// --- [AUTO-ADDED] Delete-by-File integration (Tickets) ---
// --- [END AUTO-ADDED] ---
