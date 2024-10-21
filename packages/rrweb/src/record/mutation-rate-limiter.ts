import {
  EventType,
  eventWithTime,
  IncrementalSource, Mirror,
  mutationCallbackParam,
  TMutationRateLimiterOptions,
} from '../types';
import { INode } from 'rrweb-snapshot';

export class MutationRateLimiter {
  // Set the capacity of the mutation bucket
  private bucketSize: number = 100;
  // Determines how quickly the bucket refills
  private refillRate: number = 10;
  private refillIntervalId: ReturnType<typeof setInterval>;
  // Tracks the number of remaining tokens for each node, it is decremented whenever a mutation occurs
  // We start blocking mutations for node when the number of tokens reaches 0
  private mutationBuckets: Record<string, number> = {};
  private loggedTracker: Record<string, boolean> = {};

  private mirror: Mirror;
  private options: TMutationRateLimiterOptions = {};

  constructor(mirror: Mirror, options: TMutationRateLimiterOptions = {}) {
    this.mirror = mirror;
    this.options = options;

    this.refillRate = this.options.refillRate ?? this.refillRate;
    this.bucketSize = this.options.bucketSize ?? this.bucketSize;
    this.refillIntervalId = setInterval(() => {
      this.refillBuckets();
    }, 1000);
  }

  public throttleMutations = (event: eventWithTime) => {
    if (
      event.type !== EventType.IncrementalSnapshot ||
      event.data.source !== IncrementalSource.Mutation
    ) {
      return event;
    }

    const data = event.data as Partial<mutationCallbackParam>;
    const initialMutationCount = this.numberOfChanges(data);

    if (data.attributes) {
      // Most problematic mutations come from attrs where the style or minor properties are changed rapidly
      data.attributes = data.attributes.filter((attr) => {
        const nodeId = this.getNodeOrRelevantParent(attr.id);

        if (this.mutationBuckets[nodeId] === 0) {
          return false;
        }

        this.mutationBuckets[nodeId] =
          this.mutationBuckets[nodeId] ?? this.bucketSize;
        this.mutationBuckets[nodeId] = Math.max(
          this.mutationBuckets[nodeId] - 1,
          0,
        );

        if (this.mutationBuckets[nodeId] === 0) {
          if (!this.loggedTracker[nodeId]) {
            this.loggedTracker[nodeId] = true;
            this.options.onBlockedNode?.(nodeId);
          }
        }

        return attr;
      });
    }

    // Check if every part of the mutation is empty in which case there is nothing to do
    const mutationCount = this.numberOfChanges(data);

    if (mutationCount === 0 && initialMutationCount !== mutationCount) {
      // If we have modified the mutation count and the remaining count is 0, then we don't need the event.
      return;
    }
    return event;
  };

  public cleanup = () => {
    if (this.refillIntervalId) {
      clearInterval(this.refillIntervalId);
    }
  };

  private refillBuckets = () => {
    Object.keys(this.mutationBuckets).forEach((key) => {
      this.mutationBuckets[key] = this.mutationBuckets[key] + this.refillRate;

      if (this.mutationBuckets[key] >= this.bucketSize) {
        delete this.mutationBuckets[key];
      }
    });
  };

  private getNodeOrRelevantParent = (id: number): number => {
    // For some nodes we know they are part of a larger tree such as an SVG.
    // For those we want to block the entire node, not just the specific attribute

    const node = this.mirror.getNode(id);

    // Check if the node is an Element and then find the closest parent that is an SVG
    if (node?.nodeName !== 'svg' && node instanceof Element) {
      const closestSVG = node.closest('svg');

      if (closestSVG) {
        return this.mirror.getId((closestSVG as unknown) as INode);
      }
    }

    return id;
  };

  private numberOfChanges = (data: Partial<mutationCallbackParam>) => {
    return (
      (data.removes?.length ?? 0) +
      (data.attributes?.length ?? 0) +
      (data.texts?.length ?? 0) +
      (data.adds?.length ?? 0)
    );
  };
}
