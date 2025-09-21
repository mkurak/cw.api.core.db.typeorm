import type { DataSource, DataSourceOptions, Migration } from 'typeorm';
import { DataSource as TypeOrmDataSource } from 'typeorm';
import {
    type MigrationOptions,
    type ResolvedTypeOrmConfiguration,
    type TypeOrmConfiguration,
    type DataSourceOptionsInput
} from './types.js';

function normalizeTransaction(transaction?: 'all' | 'each' | 'none'): 'all' | 'each' | 'none' {
    const allowed: Array<'all' | 'each' | 'none'> = ['all', 'each', 'none'];
    return transaction && allowed.includes(transaction) ? transaction : 'all';
}

async function resolveOptions(input: DataSourceOptionsInput): Promise<DataSourceOptions> {
    if (typeof input === 'function') {
        return input();
    }
    return input;
}

async function defaultCreateDataSource(options: DataSourceOptions): Promise<DataSource> {
    const dataSource = new TypeOrmDataSource(options);
    await dataSource.initialize();
    return dataSource;
}

function resolveConfiguration(config: TypeOrmConfiguration): ResolvedTypeOrmConfiguration {
    const {
        dataSource,
        dataSourceFactory,
        autoInitialize = false,
        runMigrationsOnInit = false,
        migrationsTransaction,
        onInitialized
    } = config;

    return {
        resolveOptions: () => resolveOptions(dataSource),
        createDataSource: async (options: DataSourceOptions) => {
            if (dataSourceFactory) {
                const instance = await dataSourceFactory(options);
                if (!instance?.initialize) {
                    throw new Error(
                        '[cw.api.core.db.typeorm] dataSourceFactory must return a TypeORM DataSource instance.'
                    );
                }
                if (!instance.isInitialized) {
                    await instance.initialize();
                }
                return instance;
            }
            return defaultCreateDataSource(options);
        },
        autoInitialize,
        runMigrationsOnInit,
        migrationsTransaction: normalizeTransaction(migrationsTransaction),
        onInitialized
    };
}

export class TypeOrmManager {
    private config?: ResolvedTypeOrmConfiguration;
    private dataSource?: DataSource;
    private initializePromise?: Promise<DataSource>;

    configure(config: TypeOrmConfiguration, options: { allowOverride?: boolean } = {}): void {
        if (!config || typeof config !== 'object') {
            throw new Error(
                '[cw.api.core.db.typeorm] configure() requires a configuration object.'
            );
        }

        if (this.config && !options.allowOverride && !config.allowReconfigure) {
            console.warn(
                '[cw.api.core.db.typeorm] configure() called multiple times; ignoring subsequent configuration.'
            );
            return;
        }

        this.config = resolveConfiguration(config);
        this.initializePromise = undefined;
        if (this.dataSource?.isInitialized) {
            void this.dataSource.destroy().catch((error) => {
                console.error(
                    '[cw.api.core.db.typeorm] Failed to dispose previous DataSource during reconfiguration.',
                    error
                );
            });
        }
        this.dataSource = undefined;

        if (this.config.autoInitialize) {
            void this.ensureInitialized().catch((error) => {
                console.error('[cw.api.core.db.typeorm] Auto-initialization failed.', error);
            });
        }
    }

    isConfigured(): boolean {
        return Boolean(this.config);
    }

    isInitialized(): boolean {
        return Boolean(this.dataSource?.isInitialized);
    }

    async ensureInitialized(): Promise<DataSource> {
        return this.getDataSource();
    }

    async getDataSource(): Promise<DataSource> {
        if (this.dataSource?.isInitialized) {
            return this.dataSource;
        }

        if (!this.initializePromise) {
            this.initializePromise = this.initialize();
        }

        this.dataSource = await this.initializePromise;
        return this.dataSource;
    }

    getDataSourceOrFail(): DataSource {
        if (!this.dataSource?.isInitialized) {
            throw new Error('[cw.api.core.db.typeorm] DataSource has not been initialized.');
        }
        return this.dataSource;
    }

    async runMigrations(options: MigrationOptions = {}): Promise<Migration[]> {
        const dataSource = await this.getDataSource();
        const transaction = normalizeTransaction(
            options.transaction ?? this.config?.migrationsTransaction
        );
        return dataSource.runMigrations({ transaction });
    }

    async revertLastMigration(options: MigrationOptions = {}): Promise<void> {
        const dataSource = await this.getDataSource();
        const transaction = normalizeTransaction(
            options.transaction ?? this.config?.migrationsTransaction
        );
        await dataSource.undoLastMigration({ transaction });
    }

    async destroy(): Promise<void> {
        if (!this.dataSource) {
            return;
        }
        if (this.dataSource.isInitialized) {
            await this.dataSource.destroy();
        }
        this.dataSource = undefined;
        this.initializePromise = undefined;
    }

    private async initialize(): Promise<DataSource> {
        if (!this.config) {
            throw new Error(
                '[cw.api.core.db.typeorm] configure() must be called before initialization.'
            );
        }

        const options = await this.config.resolveOptions();
        const dataSource = await this.config.createDataSource(options);

        if (this.config.runMigrationsOnInit) {
            await dataSource.runMigrations({ transaction: this.config.migrationsTransaction });
        }

        if (this.config.onInitialized) {
            await this.config.onInitialized(dataSource);
        }

        return dataSource;
    }
}

export async function createManagedDataSource(config: TypeOrmConfiguration): Promise<DataSource> {
    const manager = new TypeOrmManager();
    manager.configure(config, { allowOverride: true });
    return manager.getDataSource();
}
