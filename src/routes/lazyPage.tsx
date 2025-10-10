import { lazy, Suspense } from "react";
import type { ComponentType } from "react";

export function lazyPage<T extends ComponentType<any>>(
	loader: () => Promise<{ default: T }>,
	fallback: JSX.Element = <div style={{ padding: 16 }}>Loading…</div>,
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


