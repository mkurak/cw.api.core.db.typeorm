import { jest } from '@jest/globals';
import { Container, getContainer, resetContainer } from 'cw.api.core.di';
import { typeOrmModule, useTypeOrm } from '../src/module.js';
import { TypeOrmManager } from '../src/typeOrmManager.js';
import { FakeDataSource, baseOptions } from './helpers.js';

describe('typeOrmModule', () => {
    afterEach(async () => {
        await resetContainer();
        jest.restoreAllMocks();
    });

    it('registers TypeOrmManager as a singleton on a custom container', async () => {
        const container = new Container();
        container.registerModule(typeOrmModule);

        const first = container.resolve(TypeOrmManager);
        const second = container.resolve(TypeOrmManager);

        expect(first).toBeInstanceOf(TypeOrmManager);
        expect(first).toBe(second);
    });

    it('useTypeOrm configures and initializes via helper', async () => {
        const instance = new FakeDataSource(baseOptions);
        const manager = await useTypeOrm({
            container: getContainer(),
            config: {
                dataSource: baseOptions,
                dataSourceFactory: async () => instance as unknown as import('typeorm').DataSource,
                autoInitialize: true
            }
        });

        expect(manager.isConfigured()).toBe(true);
        expect(instance.isInitialized).toBe(true);
    });
});
