import type { DataSource, DataSourceOptions, Migration } from 'typeorm';

export class FakeDataSource {
    readonly options: DataSourceOptions;
    isInitialized = false;
    initializeCalls = 0;
    destroyCalls = 0;
    runMigrationsCalls: Array<{ transaction?: 'all' | 'each' | 'none' }> = [];
    undoCalls: Array<{ transaction?: 'all' | 'each' | 'none' }> = [];

    constructor(options: DataSourceOptions) {
        this.options = options;
    }

    async initialize(): Promise<DataSource> {
        this.initializeCalls += 1;
        this.isInitialized = true;
        return this as unknown as DataSource;
    }

    async destroy(): Promise<void> {
        this.destroyCalls += 1;
        this.isInitialized = false;
    }

    async runMigrations(options?: { transaction?: 'all' | 'each' | 'none' }): Promise<Migration[]> {
        this.runMigrationsCalls.push(options ?? {});
        return [];
    }

    async undoLastMigration(options?: { transaction?: 'all' | 'each' | 'none' }): Promise<void> {
        this.undoCalls.push(options ?? {});
    }
}

export const baseOptions = {
    type: 'postgres',
    url: 'postgres://localhost:5432/app'
} as unknown as DataSourceOptions;

export const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
