import { Prisma } from '@prisma/client';
import { accessibleBy } from '@casl/prisma';
import { RequestStorageService } from '../request-storage/request-storage.service';
import { Action } from '../casl/casl-ability.factory';

// This function is a factory that creates the Prisma middleware.
// It takes the RequestStorageService as a dependency.
export function createPrismaQueryMiddleware(storage: RequestStorageService) {
  return async (params, next) => {
    const ability = storage.getAbility();

    if (ability && params.model) {
      // Map Prisma actions to CASL actions
      const action = params.action === 'findUnique' || params.action === 'findFirst'
        ? Action.Read
        : params.action === 'findMany'
        ? Action.Read
        : params.action === 'create'
        ? Action.Create
        : params.action === 'update' || params.action === 'updateMany'
        ? Action.Update
        : params.action === 'delete' || params.action === 'deleteMany'
        ? Action.Delete
        : Action.Read; // Default to read for other actions like count, aggregate, etc.

      const query = accessibleBy(ability, action)[params.model];

      if (query) {
        params.args = params.args || {};
        params.args.where = {
          AND: [params.args.where, query],
        };
      }
    }

    return next(params);
  };
}
