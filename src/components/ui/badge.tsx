import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-md font-bold text-white transition-colors text-[11px] px-2 py-0.5",
	{
		variants: {
			variant: {
				default: "bg-gray-500",
				success: "bg-green-600",
				danger: "bg-red-600",
				warning: "bg-yellow-500",
				info: "bg-blue-600",
				secondary: "bg-gray-400",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
