import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { WaitlistController } from './waitlist.controller';
import { GetWaitlistCountQuery } from '../../../application/queries/get-waitlist-count.query';

describe('WaitlistControllerController', () => {
  let controller: WaitlistController;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitlistController],
      providers: [
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: queryBus,
        },
      ],
    }).compile();

    controller = module.get<WaitlistController>(WaitlistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should fetch waitlist count', async () => {
    queryBus.execute.mockResolvedValue({ count: 42 });

    await expect(controller.getWaitlistCount()).resolves.toEqual({
      data: { count: 42 },
      success: true,
    });

    expect(queryBus.execute).toHaveBeenCalledWith(new GetWaitlistCountQuery());
  });
});
