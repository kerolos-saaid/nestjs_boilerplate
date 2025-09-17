import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from '../../casl/casl-ability.factory';
import {
  CHECK_POLICIES_KEY,
  PolicyHandler,
} from '../decorators/check-policies.decorator';
import { User } from '@prisma/client';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const { user } = context.switchToHttp().getRequest();
    const ability = this.caslAbilityFactory.createForUser(user);

    const isAllowed = policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability),
    );

    if (!isAllowed) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }

  private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
