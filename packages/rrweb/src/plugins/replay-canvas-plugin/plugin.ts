import type {
  CanvasArg,
  canvasMutationData,
  canvasMutationParam,
  eventWithTime,
  ReplayPlugin,
} from '../../types';

import { deserializeCanvasArg } from './deserialize-canvas-args';
import { EventType, IncrementalSource } from '../../types';
import { Replayer } from '../../replay';
import debounce from './debounce';
import canvasMutation from '../../replay/canvas';

type CanvasEventWithTime = eventWithTime & {
  data: canvasMutationData;
  type: EventType.IncrementalSnapshot;
};

function isCanvasMutationEvent(e: eventWithTime): e is CanvasEventWithTime {
  return (
    e.type === EventType.IncrementalSnapshot &&
    e.data.source === IncrementalSource.CanvasMutation
  );
}

function getMutatedCanvasIds(e: eventWithTime, canvasContainers: number[]) {
  if (
    e.type === EventType.IncrementalSnapshot &&
    e.data.source === IncrementalSource.Mutation
  ) {
    const attributeIds = e.data.attributes.map((attr) => attr.id);
    return canvasContainers.filter((id) => attributeIds.includes(id));
  }

  return [];
}

class InvalidCanvasNodeError extends Error {}

/**
 * Find the lowest matching index for event
 */
function findIndex(
  arr: eventWithTime[],
  event?: eventWithTime,
  optionalStart?: number,
  optionalEnd?: number,
): number {
  if (!event) {
    return -1;
  }

  const start = optionalStart ?? 0;
  const end = optionalEnd ?? arr.length - 1;

  if (start > end) {
    return end;
  }

  const mid = Math.floor((start + end) / 2);

  // Search lower half
  if (event.timestamp <= arr[mid].timestamp) {
    return findIndex(arr, event, start, mid - 1);
  }

  // Search top half
  return findIndex(arr, event, mid + 1, end);
}

/**
 * Plugin which:
 *   - preloads a small amount of canvas events to improve playback
 *   - applies the canvas draw commands to a canvas outside of rrweb iframe
 *    - copies outside canvas to iframe canvas
 *    - this avoids having to remove iframe sandbox
 */
export function CanvasReplayerPlugin(
  rrwebReplayer: Replayer | null,
): ReplayPlugin {
  const PRELOAD_SIZE = 50;
  const BUFFER_TIME = 20_000;
  const canvases = new Map<number, HTMLCanvasElement>();
  const containers = new Map<number, HTMLImageElement>();
  const imageMap = new Map<CanvasEventWithTime | string, HTMLImageElement>();
  // `canvasEventMap` can not be assumed to be sorted because it is ordered by
  // insertion order and insertions will not happen in a linear timeline due to
  // the ability to jump around the playback
  const canvasEventMap = new Map<CanvasEventWithTime, canvasMutationParam>();
  const getCanvasMutationEvents = (): CanvasEventWithTime[] =>
    rrwebReplayer?.service.state.context.events.filter(isCanvasMutationEvent) ||
    [];
  // `deserializeAndPreloadCanvasEvents()` is async and `preload()` can be
  // called before the previous call finishes, so we use this Set to determine
  // if a deserialization of an event is in progress so that it can be skipped if so.
  const preloadQueue = new Set<CanvasEventWithTime>();
  const eventsToPrune: eventWithTime[] = [];
  // In the case where replay is not started and user seeks, `handler` can be
  // called before the DOM is fully built. This means that nodes do not yet
  // exist in DOM mirror. We need to replay these events when `onBuild` is
  // called.
  const handleQueue = new Map<number, [CanvasEventWithTime, Replayer]>();

  // This is a pointer to the index of the next event that will need to be
  // preloaded. Most of the time the recording plays sequentially, so we do not
  // need to re-iterate through the events list.
  //
  // If this value is -1, then it means there is no next preload index and we
  // should search (`findIndex`) the events list for the index. This happens
  // when the user jumps around the recording.
  let nextPreloadIndex = 0;

  /**
   * Prune events that are more than <20> seconds away (both older and newer) than given event.
   *
   * 20 seconds is used as the buffer because our UI's "go back 10 seconds".
   */
  function prune(event: eventWithTime): void {
    while (eventsToPrune.length) {
      // Peek top of queue and see if event should be pruned, otherwise we can break out of the loop
      if (
        Math.abs(event.timestamp - eventsToPrune[0].timestamp) <= BUFFER_TIME &&
        eventsToPrune.length <= PRELOAD_SIZE
      ) {
        break;
      }

      const eventToPrune = eventsToPrune.shift();
      if (
        eventToPrune &&
        isCanvasMutationEvent(eventToPrune) &&
        canvasEventMap.has(eventToPrune)
      ) {
        canvasEventMap.delete(eventToPrune);
      }
    }

    // TODO: as a failsafe, we could apply same logic to canvasEventMap if it goes over a certain size

    eventsToPrune.push(event);
  }

  async function deserializeAndPreloadCanvasEvents(
    data: canvasMutationData,
    event: CanvasEventWithTime,
  ): Promise<void> {
    if (!canvasEventMap.has(event)) {
      const status = {
        isUnchanged: true,
      };
      if ('commands' in data) {
        const commands = await Promise.all(
          data.commands.map(async (c) => {
            const args = await Promise.all(
              (c.args as CanvasArg[]).map(
                deserializeCanvasArg(imageMap, null, status),
              ),
            );
            return { ...c, args };
          }),
        );
        if (status.isUnchanged === false) {
          canvasEventMap.set(event, { ...data, commands });
        }
      } else {
        const args = await Promise.all(
          (data.args as CanvasArg[]).map(
            deserializeCanvasArg(imageMap, null, status),
          ),
        );
        if (status.isUnchanged === false) {
          canvasEventMap.set(event, { ...data, args });
        }
      }
    }
  }

  /**
   * Clone canvas node, change parent document of node to current document, and
   * insert an image element to original node (i.e. canvas inside of iframe).
   *
   * The image element is saved to `containers` map, which will later get
   * written to when replay is being played.
   */
  function cloneCanvas(id: number, node: HTMLCanvasElement) {
    const cloneNode = node.cloneNode() as HTMLCanvasElement;
    canvases.set(id, cloneNode);
    document.adoptNode(cloneNode);
    return cloneNode;
  }

  async function preload(
    currentEvent?: eventWithTime,
    preloadCount = PRELOAD_SIZE,
  ) {
    const foundIndex =
      nextPreloadIndex > -1
        ? nextPreloadIndex
        : findIndex(getCanvasMutationEvents(), currentEvent);
    const startIndex = foundIndex > -1 ? foundIndex : 0;
    const eventsToPreload = getCanvasMutationEvents()
      .slice(startIndex, startIndex + preloadCount)
      .filter(
        ({ timestamp }) =>
          !currentEvent || timestamp - currentEvent.timestamp <= BUFFER_TIME,
      );

    nextPreloadIndex =
      nextPreloadIndex > -1 ? nextPreloadIndex + 1 : startIndex;

    for (const event of eventsToPreload) {
      if (!preloadQueue.has(event) && !canvasEventMap.has(event)) {
        preloadQueue.add(event);
        // Deserialize and preload an event serially, otherwise for large event
        // counts, this can crash the browser
        await deserializeAndPreloadCanvasEvents(
          event.data as canvasMutationData,
          event,
        );
        preloadQueue.delete(event);
      }
    }
  }

  // Debounce so that `processEvent` is not called immediately. We want to only
  // process the most recent event, otherwise it will look like the canvas is
  // animating when we seek throughout replay.
  const debouncedProcessQueuedEvents = debounce(function processQueuedEvents() {
    // Find all canvases with an event that needs to process
    Array.from(handleQueue.entries()).forEach(async ([id, [e, replayer]]) => {
      try {
        await processEvent(e, { replayer });
        handleQueue.delete(id);
      } catch (err) {
        handleProcessEventError(err);
      }
    });
  }, 250);

  /**
   * In the case where mirror DOM is built, we only want to process the most
   * recent sync event, otherwise the playback will look like it's playing if
   * we process all events.
   */
  function processEventSync(
    e: eventWithTime,
    { replayer }: { replayer: Replayer },
  ) {
    // We want to only process the most recent sync CanvasMutationEvent
    if (isCanvasMutationEvent(e)) {
      handleQueue.set(e.data.id, [e, replayer]);
    }
    debouncedProcessQueuedEvents();
  }

  /**
   * Processes canvas mutation events
   */
  async function processEvent(
    e: CanvasEventWithTime,
    { replayer }: { replayer: Replayer },
  ) {
    preload(e);

    const source = replayer.getMirror().getNode(e.data.id);
    const target =
      canvases.get(e.data.id) ||
      (source &&
        cloneCanvas(e.data.id, (source as unknown) as HTMLCanvasElement));

    if (!target) {
      throw new InvalidCanvasNodeError('No canvas found for id');
    }

    await canvasMutation({
      event: e,
      mutation: e.data,
      target,
      imageMap,
      canvasEventMap,
      errorHandler: handleProcessEventError,
    });

    const img = containers.get(e.data.id);
    if (img) {
      img.src = target.toDataURL();
      img.className = 'rrweb-snapshot-canvas';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
    }

    prune(e);
  }

  preload();

  return {
    /**
     * When document is first built, we want to preload canvas events. After a
     * `canvas` element is built (in rrweb), insert an image element which will
     * be used to mirror the drawn canvas.
     */
    onBuild: (node, { id }) => {
      if (!node) {
        return;
      }

      if (node.nodeName === 'CANVAS' && node.nodeType === 1) {
        // Make sure that cloned canvas is up to date, re-clone if exists
        if (canvases.has(id)) {
          cloneCanvas(id, (node as unknown) as HTMLCanvasElement);
        }

        // Add new image container that will be written to
        const el = containers.get(id) || document.createElement('img');
        (node as HTMLCanvasElement).appendChild(el);
        containers.set(id, el);
      }

      // See comments at definition of `handleQueue`
      const queueItem = handleQueue.get(id);
      handleQueue.delete(id);
      if (!queueItem) {
        return;
      }
      const [event, replayer] = queueItem;
      processEvent(event, { replayer }).catch(handleProcessEventError);
    },

    /**
     * Mutate canvas outside of iframe, then export the canvas as an image, and
     * draw inside of the image el inside of replay canvas.
     */
    handler: (
      e: eventWithTime,
      isSync: boolean,
      { replayer }: { replayer: Replayer },
    ) => {
      const isCanvas = isCanvasMutationEvent(e);
      const mutatedCanvasIds = getMutatedCanvasIds(e, [...containers.keys()]);

      if (mutatedCanvasIds.length > 0) {
        mutatedCanvasIds.forEach((id) => {
          cloneCanvas(
            id,
            (replayer.getMirror().getNode(id) as unknown) as HTMLCanvasElement,
          );
        });
      }

      // isSync = true means it is fast forwarding vs playing
      // nothing to do when fast forwarding since canvas mutations for us are
      // image snapshots and do not depend on past events
      if (isSync) {
        // Set this to -1 to indicate that we will need to search
        // `canvasMutationEvents` for starting point of preloading
        //
        // Only do this when isSync is true, meaning there was a seek, since we
        // don't know where next index is
        nextPreloadIndex = -1;
        processEventSync(e, { replayer });
        prune(e);
        return;
      }

      if (!isCanvas) {
        // Otherwise, not `isSync` and not canvas, only need to prune
        prune(e);

        return;
      }

      processEvent(e as CanvasEventWithTime, { replayer }).catch(
        handleProcessEventError,
      );
    },
  };
}

function handleProcessEventError(err: unknown) {
  if (err instanceof InvalidCanvasNodeError) {
    console.warn(err);
    return;
  }
}
