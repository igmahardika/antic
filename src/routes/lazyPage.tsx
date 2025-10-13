import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import LoadingView from "@/components/feedback/LoadingView";

export function lazyPage<T extends ComponentType<any>>(
	loader: () => Promise<{ default: T }>,
	fallback: JSX.Element = <LoadingView />,
) {
	const C = lazy(loader);
	return function LazyWrapped(props: React.ComponentProps<T>) {
		return (
			<Suspense fallback={fallback}>
				<C {...props} />
			</Suspense>
		);
	};
}


