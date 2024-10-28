import { actionWithDelay, eventWithTime } from '../types';
export declare class Timer {
    timeOffset: number;
    speed: number;
    private actions;
    private raf;
    private lastTimestamp;
    constructor(actions: actionWithDelay[] | undefined, config: {
        speed: number;
    });
    addAction(action: actionWithDelay): void;
    start(): void;
    clear(): void;
    setSpeed(speed: number): void;
    isActive(): boolean;
    private rafCheck;
    private findActionIndex;
}
export declare function addDelay(event: eventWithTime, baselineTime: number): number;
