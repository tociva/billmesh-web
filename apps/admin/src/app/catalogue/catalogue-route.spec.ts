import { routes } from '../app.routes';

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
});
