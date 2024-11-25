// @todo: remove this file after TS version upgrade
// web.d.ts
interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining: () => DOMHighResTimeStamp;
}

type IdleRequestCallback = (deadline: IdleDeadline) => void;

interface Window {
  requestIdleCallback: (
    callback: IdleRequestCallback,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback: (handle: number) => void;
}

declare var requestIdleCallback: (
  callback: IdleRequestCallback,
  options?: { timeout: number },
) => number;
declare var cancelIdleCallback: (handle: number) => void;

interface MessageEvent<T = {}> extends Event {
  readonly data: T | any;
}
