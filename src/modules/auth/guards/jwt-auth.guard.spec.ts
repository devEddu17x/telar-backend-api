import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('debería estar definido', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeDefined();
  });

  it('extiende el AuthGuard de la estrategia "jwt"', () => {
    const guard = new JwtAuthGuard();
    // AuthGuard('jwt') genera una clase cuyo prototipo desciende de la mixin de passport
    expect(guard).toBeInstanceOf(AuthGuard('jwt'));
  });
});
