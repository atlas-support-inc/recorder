export default function debounce<T extends (...args: Array<unknown>) => void>(func: T, wait: number, immediate?: boolean): (this: ThisParameterType<T>, ...args: Parameters<T>) => void;
