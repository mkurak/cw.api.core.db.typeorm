#!/usr/bin/env node
import { TypeOrmManager, createManagedDataSource } from '../dist/index.js';

function fail(message, error) {
  console.error('[cw.api.core.db.typeorm] Smoke test failed:', message);
  if (error) {
    console.error(error);
  }
  process.exit(1);
}

function createStubDataSource() {
  let initialized = false;
  return {
    get isInitialized() {
      return initialized;
    },
    options: {},
    async initialize() {
      initialized = true;
      return this;
    },
    async destroy() {
      initialized = false;
    },
    async runMigrations() {
      return [];
    },
    async undoLastMigration() {
      return undefined;
    }
  };
}

async function smokeManager() {
  const stub = createStubDataSource();
  const manager = new TypeOrmManager();
  manager.configure({
    dataSource: { type: 'sqlite', database: ':memory:' },
    dataSourceFactory: async () => stub
  });

  const dataSource = await manager.ensureInitialized();
  if (!stub.isInitialized || dataSource !== stub) {
    fail('ensureInitialized did not return the stub data source');
  }

  const same = manager.getDataSourceOrFail();
  if (same !== stub) {
    fail('getDataSourceOrFail returned unexpected instance');
  }

  await manager.destroy();
  if (stub.isInitialized) {
    fail('destroy() should dispose the stub data source');
  }
}

async function smokeFactory() {
  const stub = createStubDataSource();
  const dataSource = await createManagedDataSource({
    dataSource: async () => ({ type: 'sqlite', database: ':memory:' }),
    dataSourceFactory: async () => stub
  });

  if (!stub.isInitialized || dataSource !== stub) {
    fail('createManagedDataSource did not initialise the stub data source');
  }

  await dataSource.destroy();
}

try {
  await smokeManager();
  await smokeFactory();
  console.log('[cw.api.core.db.typeorm] OK: smoke test passed');
} catch (error) {
  fail('unexpected error', error);
}
