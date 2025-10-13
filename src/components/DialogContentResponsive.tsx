import React from "react";
import { DialogContent } from "@/components/ui/dialog";

type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl";
const SIZE_TO_CLASS: Record<DialogSize, string> = {
	sm: "max-w-md",
	md: "max-w-2xl",
	lg: "max-w-4xl",
	xl: "max-w-6xl",
	"2xl": "max-w-7xl",
};

export function DialogContentResponsive({
	size = "lg",
	className = "",
	children,
	...rest
}: React.ComponentProps<typeof DialogContent> & { size?: DialogSize }) {
	const maxW = SIZE_TO_CLASS[size] ?? SIZE_TO_CLASS.lg;
	const base = `w-full ${maxW} max-h-[90vh] overflow-y-auto`;
	return (
		<DialogContent className={`${base} ${className}`} {...rest}>
			{children}
		</DialogContent>
	);
}








