export * from '../types';

export type TargetEvent<T extends Element, E extends Event = Event> = E & { currentTarget: T };
