export function PaginationControls(props: {
	page: number;
	pageSize: number;
	totalPages: number;
	onPageChange: (n: number) => void;
	onPageSizeChange: (n: number) => void;
	pageSizes?: number[];
}) {
	const {
		page,
		pageSize,
		totalPages,
		onPageChange,
		onPageSizeChange,
		pageSizes = [10, 25, 50, 100],
	} = props;
	return (
		<div
			role="navigation"
			aria-label="Pagination"
			style={{ display: "flex", gap: 8, alignItems: "center" }}
		>
			<button
				onClick={() => onPageChange(1)}
				disabled={page <= 1}
				aria-label="First page"
			>
				⏮️
			</button>
			<button
				onClick={() => onPageChange(page - 1)}
				disabled={page <= 1}
				aria-label="Previous page"
			>
				◀️
			</button>
			<span aria-live="polite" aria-atomic>{`Page ${page} of ${Math.max(
				1,
				totalPages,
			)}`}</span>
			<button
				onClick={() => onPageChange(page + 1)}
				disabled={page >= totalPages}
				aria-label="Next page"
			>
				▶️
			</button>
			<button
				onClick={() => onPageChange(totalPages)}
				disabled={page >= totalPages}
				aria-label="Last page"
			>
				⏭️
			</button>
			<label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
				Page size:
				<select
					value={pageSize}
					onChange={(e) => onPageSizeChange(Number(e.target.value))}
					aria-label="Items per page"
				>
					{pageSizes.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
			</label>
		</div>
	);
}