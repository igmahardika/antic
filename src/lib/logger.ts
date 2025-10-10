/* Lightweight logger: no-op in prod, verbose in dev */
export const logger = {
	debug: (...args: unknown[]) => {
		if (process.env.NODE_ENV !== "production")
			console.debug("[debug]", ...args);
	},
	info: (...args: unknown[]) => {
		if (process.env.NODE_ENV !== "production") console.info("[info]", ...args);
	},
	warn: (...args: unknown[]) => {
		console.warn("[warn]", ...args);
	},
	error: (...args: unknown[]) => {
		console.error("[error]", ...args);
	},
};
