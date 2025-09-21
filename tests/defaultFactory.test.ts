import { jest } from '@jest/globals';

describe('TypeOrmManager (default factory)', () => {
    afterEach(() => {
        jest.resetModules();
        jest.restoreAllMocks();
    });

    it('builds a DataSource using the default factory', async () => {
        const initialize = jest.fn(async () => {});
        const destroy = jest.fn(async () => {});
        const runMigrations = jest.fn(
            async (options?: { transaction?: 'all' | 'each' | 'none' }) => {
                void options;
                return [] as [];
            }
        );
        const undoLastMigration = jest.fn(
            async (options?: { transaction?: 'all' | 'each' | 'none' }) => {
                void options;
            }
        );

        class MockDataSource {
            isInitialized = false;
            options: unknown;

            constructor(options: unknown) {
                this.options = options;
            }

            async initialize(): Promise<this> {
                await initialize();
                this.isInitialized = true;
                return this;
            }

            async destroy(): Promise<void> {
                await destroy();
                this.isInitialized = false;
            }

            async runMigrations(options?: { transaction?: 'all' | 'each' | 'none' }): Promise<[]> {
                await runMigrations(options ?? {});
                return [];
            }

            async undoLastMigration(options?: {
                transaction?: 'all' | 'each' | 'none';
            }): Promise<void> {
                await undoLastMigration(options ?? {});
            }
        }

        jest.unstable_mockModule('typeorm', () => ({
            DataSource: MockDataSource
        }));

        const { TypeOrmManager } = await import('../src/typeOrmManager.js');

        const manager = new TypeOrmManager();
        manager.configure({
            dataSource: {
                type: 'postgres',
                url: 'postgres://localhost/test',
                migrations: [],
                entities: []
            } as never,
            autoInitialize: true,
            runMigrationsOnInit: true
        });

        await manager.ensureInitialized();
        expect(initialize).toHaveBeenCalled();
        expect(runMigrations).toHaveBeenCalledWith({ transaction: 'all' });

        await manager.destroy();
        expect(destroy).toHaveBeenCalled();
    });
});
