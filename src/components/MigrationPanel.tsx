import React, { useState, useEffect } from "react";
import MigrationService, { MigrationProgress } from "../lib/migrationService";
import { Progress } from "./ui/progress";
import { logger } from "@/lib/logger";

interface MigrationStatus {
	indexedDbTickets: number;
	indexedDbCustomers: number;
	indexedDbUsers: number;
	needsMigration: boolean;
}

const MigrationPanel: React.FC = () => {
	const [migrationStatus, setMigrationStatus] =
		useState<MigrationStatus | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isMigrating, setIsMigrating] = useState(false);
	const [progress, setProgress] = useState<MigrationProgress | null>(null);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		checkMigrationStatus();
	}, []);

	const checkMigrationStatus = async () => {
		setIsLoading(true);
		try {
			const migrationService = new MigrationService();
			const status = await migrationService.checkMigrationStatus();
			setMigrationStatus(status);
		} catch (err) {
			logger.error("Failed to check migration status:", err);
			setError("Failed to check migration status");
		} finally {
			setIsLoading(false);
		}
	};

	const handleMigration = async () => {
		if (!migrationStatus?.needsMigration) return;

		setIsMigrating(true);
		setError("");
		setSuccess("");
		setProgress(null);

		try {
			const migrationService = new MigrationService((progress) => {
				setProgress(progress);
			});

			await migrationService.migrateAll();

			setSuccess(
				"Migration completed successfully! All data has been moved to MySQL.",
			);
			setProgress(null);

			// Refresh status
			await checkMigrationStatus();
		} catch (err) {
			logger.error("Migration failed:", err);
			setError(err instanceof Error ? err.message : "Migration failed");
		} finally {
			setIsMigrating(false);
		}
	};

	if (isLoading) {
		return (
			<div className="bg-background text-foreground rounded-xl shadow-lg p-6">
				<h2 className="text-lg font-bold mb-4 text-card-foreground">
					Database Migration
				</h2>
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<span className="ml-3 text-gray-600 dark:text-gray-300">
						Checking migration status...
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-background text-foreground rounded-xl shadow-lg p-6">
			<h2 className="text-lg font-bold mb-4 text-card-foreground">
				Database Migration
			</h2>

			{/* Error Display */}
			{error && (
				<div className="bg-red-100 ring-1 ring-red-400 text-red-700 px-4 py-3 rounded mb-4">
					<div className="flex justify-between items-center">
						<span>{error}</span>
						<button
							onClick={() => setError("")}
							className="text-red-700 hover:text-red-900 font-bold"
						>
							×
						</button>
					</div>
				</div>
			)}

			{/* Success Display */}
			{success && (
				<div className="bg-green-100 ring-1 ring-green-400 text-green-700 px-4 py-3 rounded mb-4">
					<div className="flex justify-between items-center">
						<span>{success}</span>
						<button
							onClick={() => setSuccess("")}
							className="text-green-700 hover:text-green-900 font-bold"
						>
							×
						</button>
					</div>
				</div>
			)}

			{/* Migration Status */}
			{migrationStatus && (
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-3 text-card-foreground">
						Current Status
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
							<div className="text-lg font-bold text-blue-600 dark:text-blue-400">
								{migrationStatus.indexedDbTickets}
							</div>
							<div className="text-sm text-blue-800 dark:text-blue-300">
								Tickets in IndexedDB
							</div>
						</div>
						<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
							<div className="text-lg font-bold text-green-600 dark:text-green-400">
								{migrationStatus.indexedDbCustomers}
							</div>
							<div className="text-sm text-green-800 dark:text-green-300">
								Customers in IndexedDB
							</div>
						</div>
						<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
							<div className="text-lg font-bold text-purple-600 dark:text-purple-400">
								{migrationStatus.indexedDbUsers}
							</div>
							<div className="text-sm text-purple-800 dark:text-purple-300">
								Users in IndexedDB
							</div>
						</div>
					</div>

					{migrationStatus.needsMigration ? (
						<div className="bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-200 dark:ring-yellow-800 rounded-lg p-4">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<svg
										className="h-5 w-5 text-yellow-400"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-3">
									<h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
										Migration Required
									</h3>
									<div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
										<p>
											You have data in IndexedDB that needs to be migrated to
											MySQL. Click the button below to start the migration
											process.
										</p>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800 rounded-lg p-4">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<svg
										className="h-5 w-5 text-green-400"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-3">
									<h3 className="text-sm font-medium text-green-800 dark:text-green-200">
										Migration Complete
									</h3>
									<div className="mt-2 text-sm text-green-700 dark:text-green-300">
										<p>
											No migration needed. Your application is using MySQL
											database.
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Progress Display */}
			{progress && (
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-3 text-card-foreground">
						Migration Progress
					</h3>
					<Progress
						value={(progress.current / progress.total) * 100}
						className="h-2 mb-2"
					/>
					<div className="flex justify-between text-sm text-muted-foreground">
						<span>
							{progress.step}: {progress.message}
						</span>
						<span>
							{progress.current}/{progress.total}
						</span>
					</div>
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex gap-4">
				<button
					onClick={handleMigration}
					disabled={!migrationStatus?.needsMigration || isMigrating}
					className={`px-6 py-2 rounded-lg font-semibold transition-all ${
						migrationStatus?.needsMigration && !isMigrating
							? "bg-blue-600 hover:bg-blue-700 text-white"
							: "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
					}`}
				>
					{isMigrating ? "Migrating..." : "Start Migration"}
				</button>

				<button
					onClick={checkMigrationStatus}
					disabled={isMigrating}
					className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
				>
					Refresh Status
				</button>
			</div>

			{/* Migration Instructions */}
			<div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
				<h4 className="font-semibold text-card-foreground mb-2">
					Migration Process:
				</h4>
				<ul className="text-sm text-muted-foreground space-y-1">
					<li>1. Customers will be migrated first</li>
					<li>2. Tickets will be migrated next</li>
					<li>3. Data will be processed in batches to ensure reliability</li>
					<li>4. Original IndexedDB data will remain intact as backup</li>
				</ul>
			</div>
		</div>
	);
};

export default MigrationPanel;
