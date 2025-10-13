export const notify = {
  info: (msg: string) => (import.meta.env.DEV ? console.info(msg) : void 0),
  error: (msg: string) => (import.meta.env.DEV ? console.error(msg) : window.alert(msg)),
};
