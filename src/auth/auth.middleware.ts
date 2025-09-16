import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { RequestStorageService } from '../request-storage/request-storage.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly requestStorage: RequestStorageService,
  ) {}

  use(req: Request & { user?: User }, res: Response, next: NextFunction) {
    // This is where you would typically get the user from a real authentication system.
    // For the boilerplate, we'll continue to use a mock user attached to the request.
    // The PoliciesGuard already does this for protected routes, but a middleware
    // ensures it runs for ALL routes, which is important for data-level security.
    if (!req.user) {
      req.user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
    }

    const ability = this.caslAbilityFactory.createForUser(req.user);

    this.requestStorage.run(ability, () => {
      next();
    });
  }
}
