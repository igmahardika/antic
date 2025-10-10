import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
	options: { id: string; name: string }[];
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function SearchableSelect({
	options,
	value,
	onValueChange,
	placeholder = "Pilih...",
	className,
	disabled = false,
}: SearchableSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [filteredOptions, setFilteredOptions] = useState(options);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Filter options based on search term
	useEffect(() => {
		if (searchTerm.trim() === "") {
			setFilteredOptions(options);
		} else {
			const filtered = options.filter((option) =>
				option.name.toLowerCase().includes(searchTerm.toLowerCase()),
			);
			setFilteredOptions(filtered);
		}
	}, [searchTerm, options]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
				setSearchTerm("");
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// Focus search input when dropdown opens
	useEffect(() => {
		if (isOpen && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [isOpen]);

	const selectedOption = options.find((option) => option.id === value);

	const handleSelect = (optionId: string) => {
		onValueChange(optionId);
		setIsOpen(false);
		setSearchTerm("");
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onValueChange("");
		setSearchTerm("");
	};

	return (
		<div className={cn("relative", className)} ref={dropdownRef}>
			{/* Trigger Button */}
			<button
				type="button"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={cn(
					"flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
					"placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
					"disabled:cursor-not-allowed disabled:opacity-50",
					isOpen && "ring-2 ring-ring ring-offset-2",
				)}
			>
				<span
					className={cn("truncate", !selectedOption && "text-muted-foreground")}
				>
					{selectedOption ? selectedOption.name : placeholder}
				</span>
				<div className="flex items-center gap-1">
					{value && !disabled && (
						<X
							className="h-4 w-4 text-muted-foreground hover:text-foreground"
							onClick={handleClear}
						/>
					)}
					<ChevronDown
						className={cn(
							"h-4 w-4 text-muted-foreground transition-transform",
							isOpen && "rotate-180",
						)}
					/>
				</div>
			</button>

			{/* Dropdown */}
			{isOpen && (
				<div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
					{/* Search Input */}
					<div className="relative mb-2">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<input
							ref={searchInputRef}
							type="text"
							placeholder="Cari customer..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded-md border-0 bg-transparent py-2 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
						/>
					</div>

					{/* Options List */}
					<div className="max-h-60 overflow-auto">
						{filteredOptions.length > 0 ? (
							filteredOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									onClick={() => handleSelect(option.id)}
									className={cn(
										"relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
										"hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
										value === option.id && "bg-accent text-accent-foreground",
									)}
								>
									{option.name}
								</button>
							))
						) : (
							<div className="px-2 py-1.5 text-sm text-muted-foreground">
								Tidak ada customer ditemukan
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
