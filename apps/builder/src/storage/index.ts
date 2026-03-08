import path from 'node:path';

import type { BuilderConfig } from '../config';
import { LocalStorageProvider } from './local';
import { NeoFSStorageProvider } from './neofs';
import type { StorageProvider } from './types';

export function createStorageProvider(config: BuilderConfig): StorageProvider {
  if (config.storageBackend === 'neofs') {
    return new NeoFSStorageProvider(config);
  }

  return new LocalStorageProvider(path.resolve(config.localStorageRoot), config.publicUrl);
}
