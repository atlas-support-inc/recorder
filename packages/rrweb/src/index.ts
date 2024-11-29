import record from './record';
import { Replayer } from './replay';
import canvasMutation from './replay/canvas';
import { _mirror } from './utils';
import * as utils from './utils';
import * as replayUtils from './replay/utils';
import { CanvasReplayerPlugin } from './plugins/replay-canvas-plugin/plugin';

export {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from './types';

const { addCustomEvent } = record;
const { freezePage } = record;

export {
  record,
  addCustomEvent,
  freezePage,
  Replayer,
  _mirror as mirror,
  utils,
  replayUtils,
  canvasMutation,
  CanvasReplayerPlugin,
};
