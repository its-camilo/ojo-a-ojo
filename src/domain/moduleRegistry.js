import { Module1Balance } from '../modules/Module1Balance.js';
import { Module2HollowMask } from '../modules/Module2HollowMask.js';
import { Module3Ames } from '../modules/Module3Ames.js';
import { Module4RDS } from '../modules/Module4RDS.js';

export const MODULE_IDS = ['balance', 'hollow-mask', 'ames', 'rds'];

/**
 * @param {string} moduleId
 * @param {{ stereo: import('../rendering/StereoRenderer.js').StereoRenderer, complete: Function, monoOnly: boolean, cal?: object }} ctx
 */
export function createSceneModule(moduleId, ctx) {
  const { stereo, complete, monoOnly, cal } = ctx;
  switch (moduleId) {
    case 'balance':
      return new Module1Balance(stereo, complete);
    case 'hollow-mask':
      return new Module2HollowMask(stereo, monoOnly, complete);
    case 'ames':
      return new Module3Ames(stereo, monoOnly, complete);
    case 'rds':
      return new Module4RDS(stereo, cal, monoOnly, complete);
    default:
      return null;
  }
}