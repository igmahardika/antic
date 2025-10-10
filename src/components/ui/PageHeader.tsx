import React from "react";

type PageHeaderProps = {
	title: string;
	description?: string;
	className?: string;
};

/**
 * Shared page header to ensure consistent typography for titles and descriptions
 */
const PageHeader: React.FC<PageHeaderProps> = ({
	title,
	description,
	className,
}) => {
	return (
		<div className={`${className || ""}`}>
			<div className="flex flex-col gap-1">
				<h1 className="text-3xl font-bold text-card-foreground">{title}</h1>
				{description ? (
					<p className="text-muted-foreground">{description}</p>
				) : null}
			</div>
		</div>
	);
};

export default PageHeader;
