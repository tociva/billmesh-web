import { routes } from '../app.routes';
import { catalogueRoutes } from './catalogue.routes';

describe('Admin catalogue route', () => {
  it('ADMUI-012 requires authentication and billing:admin guards', () => {
    const appRoute = routes.find((candidate) => candidate.path === 'app');
    const catalogueRoute = appRoute?.children?.find(
      (candidate) => candidate.path === 'catalogue',
    );

    expect(appRoute).toBeDefined();
    expect(appRoute?.canActivate).toHaveLength(2);
    expect(appRoute?.loadComponent).toBeTypeOf('function');
    expect(catalogueRoute?.loadChildren).toBeTypeOf('function');
  });

  it('keeps product and plan operations as explicit lazy routes', async () => {
    expect(catalogueRoutes.map((route) => route.path)).toEqual([
      '',
      'create',
      ':productId/plans/create',
      ':productId/plans/:planId/edit',
      ':productId/plans/:planId/delete',
      ':productId/plans/:planId',
      ':productId/edit',
      ':productId/delete',
      ':productId',
    ]);

    for (const route of catalogueRoutes) {
      expect(await route.loadComponent?.()).toBeTypeOf('function');
    }
  });
});
