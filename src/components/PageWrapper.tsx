import React from "react";

type MaxWToken =
	| "full"
	| "prose"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl";
const MAP: Record<MaxWToken, string> = {
	full: "min(100vw, 1600px)",
	prose: "min(80ch, 95vw)",
	sm: "min(640px, 95vw)",
	md: "min(768px, 95vw)",
	lg: "min(1024px, 95vw)",
	xl: "min(1280px, 95vw)",
	"2xl": "min(1536px, 95vw)",
	"3xl": "min(1800px, 95vw)",
	"4xl": "min(2000px, 95vw)",
};

export function PageWrapper({
	children,
	maxW = "xl",
	className = "",
	style,
}: {
	children: React.ReactNode;
	maxW?: MaxWToken;
	className?: string;
	style?: React.CSSProperties;
}) {
	const cssMax = MAP[maxW] ?? MAP.xl;
	return (
		<div
			className={`w-full mx-auto px-4 md:px-8 lg:px-16 py-6 transition-all duration-300 ${className}`}
			style={{ maxWidth: cssMax, ...style }}
		>
			{children}
		</div>
	);
}

export default PageWrapper;
