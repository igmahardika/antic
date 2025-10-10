import { renderHook, act } from "@testing-library/react";
import { usePageUrlState } from "../usePageUrlState";

test("reads initial state from URL", () => {
	const url = new URL(window.location.href);
	url.searchParams.set("page", "3");
	url.searchParams.set("pageSize", "25");
	window.history.replaceState({}, "", url);
	const { result } = renderHook(() => usePageUrlState());
	expect(result.current.page).toBe(3);
	expect(result.current.pageSize).toBe(25);
});

test("updates URL on page change and clamps to >=1", () => {
	const { result } = renderHook(() => usePageUrlState());
	act(() => result.current.setPage(-5));
	expect(new URL(window.location.href).searchParams.get("page")).toBe("1");
});

test("resets to page 1 when resetOnDeps changes", () => {
	let search = "";
	const { result, rerender } = renderHook(
		({ s }) => usePageUrlState({ resetOnDeps: [s] }),
		{ initialProps: { s: search } },
	);
	act(() => result.current.setPage(4));
	search = "query";
	rerender({ s: search });
	expect(result.current.page).toBe(1);
});
import { usePageUrlState } from "../usePageUrlState";

test("reads initial state from URL", () => {
	const url = new URL(window.location.href);
	url.searchParams.set("page", "3");
	url.searchParams.set("pageSize", "25");
	window.history.replaceState({}, "", url);
	const { result } = renderHook(() => usePageUrlState());
	expect(result.current.page).toBe(3);
	expect(result.current.pageSize).toBe(25);
});

test("updates URL on page change and clamps to >=1", () => {
	const { result } = renderHook(() => usePageUrlState());
	act(() => result.current.setPage(-5));
	expect(new URL(window.location.href).searchParams.get("page")).toBe("1");
});

test("resets to page 1 when resetOnDeps changes", () => {
	let search = "";
	const { result, rerender } = renderHook(
		({ s }) => usePageUrlState({ resetOnDeps: [s] }),
		{ initialProps: { s: search } },
	);
	act(() => result.current.setPage(4));
	search = "query";
	rerender({ s: search });
	expect(result.current.page).toBe(1);
});






