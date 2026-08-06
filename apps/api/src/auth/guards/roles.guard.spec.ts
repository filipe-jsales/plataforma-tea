import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: RolesGuard;

  const contextFor = (user: { role: Role } | undefined): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('allows the request through when the route declares no required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextFor({ role: Role.STUDENT }))).toBe(true);
  });

  it('denies the request when the authenticated role is not in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.TEACHER]);

    expect(guard.canActivate(contextFor({ role: Role.STUDENT }))).toBe(false);
  });

  it('allows the request when the authenticated role is in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.TEACHER, Role.ADMIN]);

    expect(guard.canActivate(contextFor({ role: Role.TEACHER }))).toBe(true);
  });

  it('denies the request when there is no authenticated user at all', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(contextFor(undefined))).toBe(false);
  });
});
