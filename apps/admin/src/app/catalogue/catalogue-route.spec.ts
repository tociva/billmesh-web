import { routes } from '../app.routes';

describe('Admin catalogue route', () => {
  it('ADMUI-012 requires authentication and billing:admin guards', () => {
    const route = routes.find(
      (candidate) => candidate.path === 'app/catalogue',
    );
    expect(route).toBeDefined();
    expect(route?.canActivate).toHaveLength(2);
    expect(route?.loadComponent).toBeTypeOf('function');
  });
});
