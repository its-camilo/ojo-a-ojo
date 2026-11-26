import { disposeGroup } from '../rendering/sceneDispose.js';

/** @deprecated use disposeGroup */
export function clearGroup(group) {
  disposeGroup(group);
}

export { disposeGroup };