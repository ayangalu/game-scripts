export type PropertyDecorator<T, K extends keyof T> = (target: T, key: K) => void;

export type TargetEvent<T extends Element, E extends Event = Event> = E & { readonly currentTarget: T; };
