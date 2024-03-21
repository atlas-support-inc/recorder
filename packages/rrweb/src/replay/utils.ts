import { EventType, eventWithTime, IncrementalSource, TInactivityRange } from '../types';

export const SKIP_TIME_THRESHOLD = 10 * 1000;
export const SKIP_TIME_INTERVAL = 3 * 1000;

function msToTime(ms: number) {
  const from = ms < 3600000 ? 14 : 11;
  const len = ms < 3600000 ? 5 : 8;
  return new Date(ms).toISOString().slice(from, from + len);
}

export function isUserInteraction(event: eventWithTime): boolean {
  if (event.type !== EventType.IncrementalSnapshot) {
    return false;
  }

  return (
    event.data.source > IncrementalSource.Mutation &&
    event.data.source <= IncrementalSource.Input
  );
}

export function getInactivityRanges(
  events: eventWithTime[],
  startTime: number,
  endTime: number,
): TInactivityRange[] {
  const ranges: TInactivityRange[] = [];
  let lastInteraction: eventWithTime | undefined;

  events.forEach((event, idx) => {
    if (isUserInteraction(event)) {
      lastInteraction = event;
      return;
    }

    const nextUserInteractionEvent = events.slice(idx + 1).find(isUserInteraction);
    if (nextUserInteractionEvent) {
      lastInteraction = nextUserInteractionEvent;
    }

    const isInactivity =
      nextUserInteractionEvent && nextUserInteractionEvent.timestamp - event.timestamp > SKIP_TIME_THRESHOLD;

    if (isInactivity) {
      const startMs = event.timestamp - startTime;
      const endMs = nextUserInteractionEvent!.timestamp - startTime;
      const rangeStartTime = msToTime(startMs);
      const rangeEndTime = msToTime(endMs);

      const rangeExists = ranges.some((range) => rangeStartTime >= range.startTime && rangeEndTime <= range.endTime);

      if (!rangeExists) {
        ranges.push({
          startMs,
          endMs,
          startTime: rangeStartTime,
          endTime: rangeEndTime,
        });
      }
    }
  });

  if (lastInteraction && endTime - lastInteraction.timestamp > SKIP_TIME_THRESHOLD) {
    ranges.push({
      startMs: lastInteraction.timestamp - startTime,
      endMs: endTime - startTime,
      startTime: msToTime(lastInteraction.timestamp - startTime),
      endTime: msToTime(endTime - startTime),
    });
  }

  return ranges;
}
