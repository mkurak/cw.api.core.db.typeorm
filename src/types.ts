import type { DataSource, DataSourceOptions } from 'typeorm';

export type DataSourceOptionsInput =
    | DataSourceOptions
    | (() => DataSourceOptions | Promise<DataSourceOptions>);

export type DataSourceFactory =
    | ((options: DataSourceOptions) => DataSource | Promise<DataSource>)
    | undefined;

export interface TypeOrmConfiguration {
    /**
     * DataSource options or factory returning options lazily.
     */
    dataSource: DataSourceOptionsInput;
    /**
     * Optional factory to create a DataSource instance. Defaults to `new DataSource(options)`.
     */
    dataSourceFactory?: DataSourceFactory;
    /**
     * Auto initialize the DataSource after configuration.
     */
    autoInitialize?: boolean;
    /**
     * Execute pending migrations immediately after initialization.
     */
    runMigrationsOnInit?: boolean;
    /**
     * Default transaction behaviour for migration commands.
     */
    migrationsTransaction?: 'all' | 'each' | 'none';
    /**
     * Callback fired once the DataSource has been initialized successfully.
     */
    onInitialized?: (dataSource: DataSource) => unknown | Promise<unknown>;
    /**
     * Allow replacing an existing configuration.
     */
    allowReconfigure?: boolean;
}

export interface MigrationOptions {
    transaction?: 'all' | 'each' | 'none';
}

export interface ResolvedTypeOrmConfiguration {
    resolveOptions: () => Promise<DataSourceOptions>;
    createDataSource: (options: DataSourceOptions) => Promise<DataSource>;
    autoInitialize: boolean;
    runMigrationsOnInit: boolean;
    migrationsTransaction: 'all' | 'each' | 'none';
    onInitialized?: (dataSource: DataSource) => unknown | Promise<unknown>;
}

export interface ConfigureOptions {
    allowOverride?: boolean;
}

export interface UseTypeOrmOptions {
    container?: import('cw.api.core.di').Container;
    config?: TypeOrmConfiguration;
    autoInitialize?: boolean;
    configure?: (manager: import('./typeOrmManager.js').TypeOrmManager) => void;
}
