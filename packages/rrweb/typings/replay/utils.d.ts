import { eventWithTime, TInactivityRange } from '../types';
export declare const SKIP_TIME_THRESHOLD: number;
export declare const SKIP_TIME_INTERVAL: number;
export declare const SKIP_MIN_SPEED = 16;
export declare function isUserInteraction(event: eventWithTime): boolean;
export declare function getInactivityRanges(events: eventWithTime[], startTime: number, endTime: number): TInactivityRange[];
