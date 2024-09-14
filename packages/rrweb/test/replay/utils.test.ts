import { EventType, IncrementalSource } from 'rrweb';
import {
  getInactivityRanges,
  SKIP_TIME_THRESHOLD,
} from '../../src/replay/utils';
import { eventWithTime } from '../../src/types';

const createEvent = (
  timestamp: number,
  type: number,
  source?: IncrementalSource,
): eventWithTime => ({
  timestamp,
  type,
  data: {
    source,
  },
});

describe('getInactivityRanges', () => {
  const durationInSeconds = 20;
  const START_TIME = 1;
  const END_TIME = durationInSeconds * 1000;

  test('returns an empty array when there are no events', () => {
    const events: eventWithTime[] = [];
    const result = getInactivityRanges(events, START_TIME, END_TIME);
    expect(result).toEqual([]);
  });

  test('returns no inactivity ranges when interactions are frequent', () => {
    let events: eventWithTime[] = [];
    for (let i = 0; i < durationInSeconds; i++) {
      events.push(
        createEvent(
          START_TIME + i * 1000,
          EventType.IncrementalSnapshot,
          IncrementalSource.MouseMove,
        ),
      );
    }

    const result = getInactivityRanges(events, START_TIME, END_TIME);
    expect(result).toEqual([]);
  });

  test('returns correct inactivity ranges when there is inactivity', () => {
    const events = [
      createEvent(
        START_TIME,
        EventType.IncrementalSnapshot,
        IncrementalSource.MouseMove,
      ),
      createEvent(
        START_TIME + 1000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Input,
      ),
      // Inactivity period > SKIP_TIME_THRESHOLD (10 seconds)
      createEvent(
        START_TIME + SKIP_TIME_THRESHOLD + 5000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Input,
      ),
    ];

    const result = getInactivityRanges(events, START_TIME, END_TIME);

    expect(result).toEqual([
      {
        startMs: 1000,
        endMs: SKIP_TIME_THRESHOLD + 5000,
        startTime: '00:01',
        endTime: '00:15',
      },
    ]);
  });

  test('handles inactivity range at the end of the event list', () => {
    let events: eventWithTime[] = [];
    const skipTimeSecs = SKIP_TIME_THRESHOLD / 1000;
    for (let i = 0; i < durationInSeconds - skipTimeSecs; i++) {
      events.push(
        createEvent(
          START_TIME + i * 1000,
          EventType.IncrementalSnapshot,
          IncrementalSource.MouseMove,
        ),
      );
    }

    const result = getInactivityRanges(events, START_TIME, END_TIME);

    // Inactivity from the last interaction to the end time
    expect(result).toEqual([
      {
        startMs: (durationInSeconds - skipTimeSecs - 1) * 1000,
        endMs: END_TIME - START_TIME,
        startTime: '00:09',
        endTime: '00:19',
      },
    ]);
  });

  test('does not add duplicate inactivity ranges', () => {
    const events = [
      createEvent(
        START_TIME,
        EventType.IncrementalSnapshot,
        IncrementalSource.MouseMove,
      ),
      createEvent(
        START_TIME + 1000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Input,
      ),
      createEvent(
        START_TIME + SKIP_TIME_THRESHOLD + 5000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Input,
      ),
      createEvent(
        START_TIME + SKIP_TIME_THRESHOLD + 6000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Input,
      ),
    ];

    const result = getInactivityRanges(events, START_TIME, END_TIME);

    // Should only add one inactivity range despite multiple close events
    expect(result).toEqual([
      {
        startMs: 1000,
        endMs: SKIP_TIME_THRESHOLD + 5000,
        startTime: '00:01',
        endTime: '00:15',
      },
    ]);
  });

  test('handles no user interactions after initial events', () => {
    const events = [
      createEvent(START_TIME, EventType.FullSnapshot),
      createEvent(
        START_TIME + 1000,
        EventType.IncrementalSnapshot,
        IncrementalSource.MouseMove,
      ),
      createEvent(
        START_TIME + 2000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Mutation,
      ), // Non-interaction event
      createEvent(
        START_TIME + 5000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Mutation,
      ), // Non-interaction event
    ];

    const result = getInactivityRanges(events, START_TIME, END_TIME);

    // Entire remaining period is inactivity
    expect(result).toEqual([
      {
        startMs: 1000,
        endMs: END_TIME - START_TIME,
        startTime: '00:01',
        endTime: '00:19',
      },
    ]);
  });

  test('handles inactivity range between two interactions', () => {
    const events = [
      createEvent(START_TIME, EventType.FullSnapshot),
      createEvent(
        START_TIME + 1000,
        EventType.IncrementalSnapshot,
        IncrementalSource.MouseMove,
      ),
      createEvent(
        START_TIME + 3000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Mutation,
      ), // Non-interaction event
      createEvent(
        START_TIME + 5000,
        EventType.IncrementalSnapshot,
        IncrementalSource.ViewportResize,
      ),
      createEvent(
        START_TIME + 9000,
        EventType.IncrementalSnapshot,
        IncrementalSource.Mutation,
      ), // Non-interaction event
      createEvent(
        START_TIME + 17000,
        EventType.IncrementalSnapshot,
        IncrementalSource.ViewportResize,
      ),
    ];

    const result = getInactivityRanges(events, START_TIME, END_TIME);

    // Inactivity between 2 ViewPortResize events
    expect(result).toEqual([
      {
        startMs: 5000,
        endMs: 17000,
        startTime: '00:05',
        endTime: '00:17',
      },
    ]);
  });
});
