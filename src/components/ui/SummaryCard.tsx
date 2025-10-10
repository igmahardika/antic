import React from "react";

// This standardized SummaryCard is based on the new design guidelines.
// It enforces a consistent layout, typography, and spacing for all summary metrics.
// The icon background color can be customized via the `iconBg` prop for semantic coloring.
// Example: <SummaryCard iconBg="bg-green-100 dark:bg-green-900/40" ... />

interface SummaryCardProps {
	icon: React.ReactNode;
	iconBg: string; // Tailwind bg color, e.g. "bg-blue-500"
	title: string;
	badge?: string;
	badgeColor?: string; // Tailwind bg color, e.g. "bg-blue-500"
	value: string | number | React.ReactNode;
	subvalue?: string;
	description: string;
	className?: string;
	onClick?: () => void;
	active?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
	icon,
	iconBg,
	title,
	badge,
	badgeColor = "bg-blue-500",
	value,
	subvalue,
	description,
	className = "",
	onClick,
	active = false,
}) => (
	<div
		className={`bg-card text-card-foreground rounded-2xl shadow-lg p-3 flex flex-col min-h-[110px] transition-all duration-300 min-w-0 overflow-hidden 
      ${onClick ? "cursor-pointer hover:shadow-xl hover:scale-[1.02]" : ""}
      ${active ? "" : ""}
      ${className}`}
		onClick={onClick}
		tabIndex={onClick ? 0 : undefined}
		role={onClick ? "button" : undefined}
		aria-pressed={active}
	>
		<div className="flex items-center gap-2 mb-1.5">
			<div
				className={`w-9 h-9 min-w-9 min-h-9 rounded-lg flex items-center justify-center ${iconBg} shadow-lg`}
			>
				<span className="text-white" style={{ fontSize: 18 }}>
					{icon}
				</span>
			</div>
			<div className="flex-1 flex items-center">
				<span className="text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-wide break-words whitespace-normal">
					{title}
				</span>
				{badge && (
					<span
						className={`ml-2 px-2 py-0.5 rounded-md text-xs font-bold text-white ${badgeColor}`}
					>
						{badge}
					</span>
				)}
			</div>
		</div>
		<div className="flex items-end min-h-[28px]">
			<span
				className={`font-extrabold tracking-tight break-words ${
					// Jika value adalah string (nama agent), gunakan font size yang lebih kecil
					typeof value === "string" && value.length > 15
						? "text-sm md:text-base lg:text-lg"
						: "text-lg md:text-xl lg:text-2xl font-mono"
				}`}
			>
				{typeof value === "string" && value.length > 20 ? (
					<span className="truncate block" title={value}>
						{value}
					</span>
				) : (
					value
				)}
			</span>
			{subvalue && (
				<span className="text-sm md:text-base font-semibold text-muted-foreground ml-1 mb-0.5 align-bottom">
					{subvalue}
				</span>
			)}
		</div>
		<div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 break-words whitespace-normal">
			{description}
		</div>
	</div>
);

export default SummaryCard;
