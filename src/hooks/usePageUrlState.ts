import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type RefObject,
} from "react";

export type PageUrlStateOptions = {
	paramPage?: string;
	paramPageSize?: string;
	initialPage?: number;
	initialPageSize?: number;
	clampToTotalPages?: boolean;
	totalItems?: number;
	allowedPageSizes?: number[];
	replaceHistory?: boolean;
	scrollBehavior?: ScrollBehavior;
	scrollContainerRef?: RefObject<HTMLElement> | null;
	resetOnDeps?: ReadonlyArray<unknown>;
};

export type PageUrlState = {
	page: number;
	pageSize: number;
	setPage: (next: number) => void;
	setPageSize: (next: number) => void;
	totalPages?: number;
	syncFromUrl: () => void;
};

function parseIntSafe(v: string | null | undefined): number | null {
	if (v == null) return null;
	const n = Number.parseInt(v, 10);
	return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min: number, max: number): number {
	if (!Number.isFinite(n)) return min;
	return Math.max(min, Math.min(max, n));
}

function buildUrlWithParams(params: URLSearchParams, key: string, value: string) {
	const next = new URL(window.location.href);
	const q = new URLSearchParams(params);
	q.set(key, value);
	next.search = q.toString();
	return next;
}

export function usePageUrlState(options: PageUrlStateOptions = {}): PageUrlState {
	const {
		paramPage = "page",
		paramPageSize = "pageSize",
		initialPage = 1,
		initialPageSize = 50,
		clampToTotalPages = true,
		totalItems,
		allowedPageSizes,
		replaceHistory = true,
		scrollBehavior = "smooth",
		scrollContainerRef = null,
		resetOnDeps
	} = options;

	const initial = useMemo(() => {
		const sp = new URLSearchParams(window.location.search);
		const rawPage = parseIntSafe(sp.get(paramPage));
		const rawSize = parseIntSafe(sp.get(paramPageSize));

		let pageSize = rawSize ?? initialPageSize;
		if (allowedPageSizes && allowedPageSizes.length) {
			if (!allowedPageSizes.includes(pageSize)) pageSize = initialPageSize;
		}

		let page = rawPage ?? initialPage;
		if (page < 1) page = 1;

		return { page, pageSize };
	}, [paramPage, paramPageSize, initialPage, initialPageSize, allowedPageSizes]);

	const [page, _setPage] = useState<number>(initial.page);
	const [pageSize, _setPageSize] = useState<number>(initial.pageSize);

	const totalPages = useMemo(() => {
		if (typeof totalItems === "number" && Number.isFinite(totalItems) && totalItems >= 0) {
			return Math.max(1, Math.ceil(totalItems / pageSize));
		}
		return undefined;
	}, [totalItems, pageSize]);

	const pageRef = useRef(page);
	useEffect(() => {
		pageRef.current = page;
	}, [page]);

	const writeParam = useCallback((key: string, value: string) => {
		const current = new URLSearchParams(window.location.search);
		const nextUrl = buildUrlWithParams(current, key, value);
		const method = replaceHistory ? "replaceState" : "pushState";
		window.history[method]({}, "", nextUrl);
	}, [replaceHistory]);

	const setPage = useCallback((next: number) => {
		let nextPage = Math.max(1, Math.floor(next));
		if (clampToTotalPages && typeof totalPages === "number") {
			nextPage = clamp(nextPage, 1, totalPages);
		}
		_setPage(nextPage);
		writeParam(paramPage, String(nextPage));
	}, [clampToTotalPages, totalPages, paramPage, writeParam]);

	const setPageSize = useCallback((next: number) => {
		let nextSize = Math.max(1, Math.floor(next));
		if (allowedPageSizes && allowedPageSizes.length && !allowedPageSizes.includes(nextSize)) {
			nextSize = initialPageSize;
		}
		_setPageSize(nextSize);
		writeParam(paramPageSize, String(nextSize));
		_setPage(1);
		writeParam(paramPage, "1");
	}, [allowedPageSizes, initialPageSize, paramPage, paramPageSize, writeParam]);

	const syncFromUrl = useCallback(() => {
		const sp = new URLSearchParams(window.location.search);
		const rawPage = parseIntSafe(sp.get(paramPage));
		const rawSize = parseIntSafe(sp.get(paramPageSize));

		if (rawSize != null) {
			let s = rawSize;
			if (allowedPageSizes && allowedPageSizes.length && !allowedPageSizes.includes(s)) {
				s = initialPageSize;
			}
			if (s !== pageSize) _setPageSize(s);
		}
		if (rawPage != null) {
			let p = Math.max(1, rawPage);
			if (clampToTotalPages && typeof totalPages === "number") p = clamp(p, 1, totalPages);
			if (p !== page) _setPage(p);
		}
	}, [paramPage, paramPageSize, page, pageSize, allowedPageSizes, initialPageSize, clampToTotalPages, totalPages]);

	useEffect(() => {
		const handler = () => syncFromUrl();
		window.addEventListener("popstate", handler);
		return () => window.removeEventListener("popstate", handler);
	}, [syncFromUrl]);

	useEffect(() => {
		const scrollTarget: HTMLElement | (Window & typeof globalThis) | null = scrollContainerRef?.current ?? window;
		if (page !== initial.page) {
			const id = requestAnimationFrame(() => {
				if (scrollTarget === window) {
					window.scrollTo({ top: 0, behavior: (scrollBehavior as ScrollBehavior) ?? "smooth" });
				} else if (scrollTarget) {
					try {
						(scrollTarget as HTMLElement).scrollTo({ top: 0, behavior: (scrollBehavior as ScrollBehavior) ?? "smooth" });
					} catch {
						(scrollTarget as HTMLElement).scrollTop = 0;
					}
				}
			});
			return () => cancelAnimationFrame(id);
		}
	}, [page, initial.page, scrollBehavior, scrollContainerRef]);

	useEffect(() => {
		if (!resetOnDeps) return;
		if (pageRef.current !== 1) {
			_setPage(1);
			writeParam(paramPage, "1");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, resetOnDeps ?? []);

	return { page, pageSize, setPage, setPageSize, totalPages, syncFromUrl };
}






