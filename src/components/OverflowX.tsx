import React from "react";

export function OverflowX({
	children,
	minWidth = 800,
	className = "",
	contentClassName = "",
	style,
}: {
	children: React.ReactNode;
	minWidth?: number;
	className?: string;
	contentClassName?: string;
	style?: React.CSSProperties;
}) {
	return (
		<div className={`w-full overflow-x-auto ${className}`} style={style}>
			<div className={contentClassName} style={{ minWidth }}>
				{children}
			</div>
		</div>
	);
}


