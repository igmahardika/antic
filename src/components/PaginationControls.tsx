import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

	// Don't show pagination if only 1 page
	if (totalPages <= 1) {
		return (
			<div className="flex items-center justify-between w-full">
				<div className="flex items-center space-x-2">
					<p className="text-sm text-muted-foreground">
						Showing all results
					</p>
				</div>
				<div className="flex items-center space-x-2">
					<p className="text-sm text-muted-foreground">Rows per page:</p>
					<Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
						<SelectTrigger className="h-8 w-[70px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{pageSizes.map((size) => (
								<SelectItem key={size} value={size.toString()}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between w-full">
			<div className="flex items-center space-x-2">
				<p className="text-sm text-muted-foreground">
					Page {page} of {totalPages}
				</p>
			</div>
			
			<div className="flex items-center space-x-2">
				<div className="flex items-center space-x-1">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(1)}
						disabled={page <= 1}
						aria-label="First page"
						className="h-8 w-8 p-0"
					>
						<ChevronsLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(page - 1)}
						disabled={page <= 1}
						aria-label="Previous page"
						className="h-8 w-8 p-0"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(page + 1)}
						disabled={page >= totalPages}
						aria-label="Next page"
						className="h-8 w-8 p-0"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(totalPages)}
						disabled={page >= totalPages}
						aria-label="Last page"
						className="h-8 w-8 p-0"
					>
						<ChevronsRight className="h-4 w-4" />
					</Button>
				</div>
				
				<div className="flex items-center space-x-2">
					<p className="text-sm text-muted-foreground">Rows per page:</p>
					<Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
						<SelectTrigger className="h-8 w-[70px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{pageSizes.map((size) => (
								<SelectItem key={size} value={size.toString()}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}