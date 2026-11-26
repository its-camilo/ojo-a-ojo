import { LAYER_BOTH } from './StereoRenderer.js';

/** Contenido compartido visible en ambos ojos (paredes, UI, figuras no dicópticas). */
export function enableSharedStereoLayers(object) {
  object.traverse((child) => {
    if (child.layers) {
      child.layers.enable(LAYER_BOTH);
    }
  });
}