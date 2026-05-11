import { Query } from '@nestjs/cqrs';

export class GetWaitlistCountQuery extends Query<GetWaitlistCountResult> {
  constructor() {
    super();
  }
}

export type GetWaitlistCountResult = {
  count: number;
};
