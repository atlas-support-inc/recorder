import { eventWithTime, Mirror, TMutationRateLimiterOptions } from '../types';
export declare class MutationRateLimiter {
    private bucketSize;
    private refillRate;
    private refillIntervalId;
    private mutationBuckets;
    private loggedTracker;
    private mirror;
    private options;
    constructor(mirror: Mirror, options?: TMutationRateLimiterOptions);
    throttleMutations: (event: eventWithTime) => (import("../types").domContentLoadedEvent & {
        timestamp: number;
        delay?: number | undefined;
    }) | (import("../types").loadedEvent & {
        timestamp: number;
        delay?: number | undefined;
    }) | (import("../types").fullSnapshotEvent & {
        timestamp: number;
        delay?: number | undefined;
    }) | (import("../types").incrementalSnapshotEvent & {
        timestamp: number;
        delay?: number | undefined;
    }) | (import("../types").metaEvent & {
        timestamp: number;
        delay?: number | undefined;
    }) | (import("../types").customEvent<unknown> & {
        timestamp: number;
        delay?: number | undefined;
    }) | (import("../types").pluginEvent<unknown> & {
        timestamp: number;
        delay?: number | undefined;
    }) | undefined;
    cleanup: () => void;
    private refillBuckets;
    private getNodeOrRelevantParent;
    private numberOfChanges;
}
