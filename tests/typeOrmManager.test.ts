import { jest } from '@jest/globals';
import { TypeOrmManager, createManagedDataSource } from '../src/typeOrmManager.js';
import type { TypeOrmConfiguration } from '../src/types.js';
import { FakeDataSource, baseOptions, delay } from './helpers.js';

function createConfig(overrides: Partial<TypeOrmConfiguration> = {}): TypeOrmConfiguration {
    return {
        dataSource: baseOptions,
        dataSourceFactory: async (options) =>
            new FakeDataSource(options) as unknown as import('typeorm').DataSource,
        ...overrides
    } satisfies TypeOrmConfiguration;
}

describe('TypeOrmManager', () => {
    it('throws when accessed before configuration', async () => {
        const manager = new TypeOrmManager();
        await expect(manager.getDataSource()).rejects.toThrow('configure');
    });

    it('initializes the data source once and reuses it', async () => {
        const created: FakeDataSource[] = [];
        const manager = new TypeOrmManager();
        manager.configure(
            createConfig({
                dataSourceFactory: async (options) => {
                    const instance = new FakeDataSource(options);
                    created.push(instance);
                    return instance as unknown as import('typeorm').DataSource;
                }
            })
        );

        const first = await manager.getDataSource();
        const second = await manager.getDataSource();

        expect(first).toBe(second);
        expect(created).toHaveLength(1);
        expect(created[0].isInitialized).toBe(true);
        expect(created[0].initializeCalls).toBe(1);
    });

    it('autoinitializes and runs migrations when configured', async () => {
        const manager = new TypeOrmManager();
        const instance = new FakeDataSource(baseOptions);
        manager.configure(
            createConfig({
                dataSourceFactory: async () => instance as unknown as import('typeorm').DataSource,
                autoInitialize: true,
                runMigrationsOnInit: true,
                migrationsTransaction: 'each'
            })
        );

        await delay(0);
        expect(instance.isInitialized).toBe(true);
        expect(instance.runMigrationsCalls[0]).toEqual({ transaction: 'each' });
    });

    it('runs migrations and reverts using configured defaults', async () => {
        const manager = new TypeOrmManager();
        const instance = new FakeDataSource(baseOptions);
        manager.configure(
            createConfig({
                dataSourceFactory: async () => instance as unknown as import('typeorm').DataSource,
                migrationsTransaction: 'none'
            })
        );

        await manager.runMigrations();
        await manager.revertLastMigration({ transaction: 'each' });

        expect(instance.runMigrationsCalls[0]).toEqual({ transaction: 'none' });
        expect(instance.undoCalls[0]).toEqual({ transaction: 'each' });
    });

    it('destroys the underlying data source', async () => {
        const manager = new TypeOrmManager();
        const instance = new FakeDataSource(baseOptions);
        manager.configure(
            createConfig({
                dataSourceFactory: async () => instance as unknown as import('typeorm').DataSource
            })
        );

        await manager.getDataSource();
        await manager.destroy();

        expect(instance.destroyCalls).toBe(1);
        expect(manager.isInitialized()).toBe(false);
    });

    it('warns when configure is called twice without override', async () => {
        const manager = new TypeOrmManager();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        manager.configure(createConfig());
        manager.configure(createConfig());
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('allows reconfiguration when permitted', async () => {
        const manager = new TypeOrmManager();
        const first = new FakeDataSource(baseOptions);
        const second = new FakeDataSource({ ...baseOptions, database: 'other' } as never);

        manager.configure(
            createConfig({
                dataSourceFactory: async () => first as unknown as import('typeorm').DataSource
            })
        );

        await manager.getDataSource();

        manager.configure(
            createConfig({
                dataSourceFactory: async () => second as unknown as import('typeorm').DataSource,
                allowReconfigure: true
            })
        );

        const ds = await manager.getDataSource();
        expect(ds).not.toBe(first);
        expect(second.isInitialized).toBe(true);
    });

    it('creates a managed data source via helper', async () => {
        const dataSource = await createManagedDataSource(
            createConfig({
                dataSourceFactory: async (options) =>
                    new FakeDataSource(options) as unknown as import('typeorm').DataSource
            })
        );

        expect((dataSource as unknown as FakeDataSource).isInitialized).toBe(true);
    });

    it('accepts dataSource option factories', async () => {
        const manager = new TypeOrmManager();
        const instance = new FakeDataSource(baseOptions);
        manager.configure({
            dataSource: async () => baseOptions,
            dataSourceFactory: async () => instance as unknown as import('typeorm').DataSource
        });

        await manager.ensureInitialized();
        expect(instance.isInitialized).toBe(true);
    });

    it('throws when configure receives invalid input', () => {
        const manager = new TypeOrmManager();
        expect(() => manager.configure(undefined as unknown as TypeOrmConfiguration)).toThrow(
            /requires a configuration object/
        );
    });

    it('fails when dataSourceFactory returns an invalid instance', async () => {
        const manager = new TypeOrmManager();
        manager.configure({
            dataSource: baseOptions,

            dataSourceFactory: async () => ({}) as unknown as import('typeorm').DataSource
        });

        await expect(manager.getDataSource()).rejects.toThrow('must return a TypeORM DataSource');
    });

    it('logs when destroying previous data source fails during reconfiguration', async () => {
        const manager = new TypeOrmManager();
        const failing = new FakeDataSource(baseOptions);
        const failingDestroyMock = jest.fn(async () => {
            throw new Error('boom');
        });
        failing.destroy = failingDestroyMock as unknown as FakeDataSource['destroy'];
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        manager.configure(
            createConfig({
                dataSourceFactory: async () => failing as unknown as import('typeorm').DataSource
            })
        );
        await manager.ensureInitialized();

        manager.configure(
            createConfig({
                dataSourceFactory: async () =>
                    new FakeDataSource(baseOptions) as unknown as import('typeorm').DataSource,
                allowReconfigure: true
            })
        );

        await delay(0);
        expect(failingDestroyMock).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to dispose previous DataSource'),
            expect.any(Error)
        );
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('captures auto-initialization errors', async () => {
        const manager = new TypeOrmManager();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        manager.configure({
            dataSource: baseOptions,
            dataSourceFactory: async () => {
                return {
                    isInitialized: false,
                    async initialize() {
                        throw new Error('init failed');
                    }
                } as unknown as import('typeorm').DataSource;
            },
            autoInitialize: true
        });

        await delay(0);
        expect(errorSpy).toHaveBeenCalledWith(
            '[cw.api.core.db.typeorm] Auto-initialization failed.',
            expect.any(Error)
        );
        errorSpy.mockRestore();
    });

    it('exposes initialized data source synchronously via getDataSourceOrFail', async () => {
        const manager = new TypeOrmManager();
        const instance = new FakeDataSource(baseOptions);
        manager.configure(
            createConfig({
                dataSourceFactory: async () => instance as unknown as import('typeorm').DataSource
            })
        );

        await manager.ensureInitialized();
        expect(manager.getDataSourceOrFail()).toBe(instance);
        await manager.destroy();
        await expect(async () => manager.getDataSourceOrFail()).rejects.toThrow(
            'has not been initialized'
        );
    });

    it('no-ops destroy when no data source exists', async () => {
        const manager = new TypeOrmManager();
        await manager.destroy();
        expect(manager.isInitialized()).toBe(false);
    });

    it('runs initialization callbacks', async () => {
        const manager = new TypeOrmManager();
        const instance = new FakeDataSource(baseOptions);
        const hook = jest.fn();

        manager.configure(
            createConfig({
                dataSourceFactory: async () => instance as unknown as import('typeorm').DataSource,
                onInitialized: hook
            })
        );

        await manager.ensureInitialized();
        expect(hook).toHaveBeenCalledWith(instance);
    });
});
