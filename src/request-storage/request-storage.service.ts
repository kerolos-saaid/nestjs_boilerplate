import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { AppAbility } from '../casl/casl-ability.factory';

@Injectable()
export class RequestStorageService {
  private readonly als: AsyncLocalStorage<{ ability: AppAbility }>;

  constructor() {
    this.als = new AsyncLocalStorage();
  }

  run(ability: AppAbility, callback: () => any) {
    this.als.run({ ability }, callback);
  }

  getAbility(): AppAbility | undefined {
    return this.als.getStore()?.ability;
  }
}
