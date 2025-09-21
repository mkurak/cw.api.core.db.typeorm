import {
    Lifecycle,
    createModule,
    getContainer,
    registerModules,
    type Container
} from 'cw.api.core.di';
import { TypeOrmManager } from './typeOrmManager.js';
import type { TypeOrmConfiguration, UseTypeOrmOptions } from './types.js';

const configuredManagers = new WeakSet<TypeOrmManager>();

export const typeOrmModule = createModule({
    name: 'cw.api.core.db.typeorm',
    providers: [
        {
            useClass: TypeOrmManager,
            options: {
                lifecycle: Lifecycle.Singleton
            }
        }
    ],
    exports: [TypeOrmManager]
});

export async function useTypeOrm(options: UseTypeOrmOptions = {}): Promise<TypeOrmManager> {
    const container: Container = options.container ?? getContainer();
    registerModules(container, typeOrmModule);
    const manager = container.resolve(TypeOrmManager);

    if (options.config) {
        applyConfiguration(manager, options.config);
    }

    options.configure?.(manager);

    if (options.autoInitialize || options.config?.autoInitialize) {
        await manager.ensureInitialized();
    }

    return manager;
}

function applyConfiguration(manager: TypeOrmManager, config: TypeOrmConfiguration): void {
    if (configuredManagers.has(manager)) {
        manager.configure(config, { allowOverride: config.allowReconfigure });
    } else {
        manager.configure(config);
        configuredManagers.add(manager);
    }
}
