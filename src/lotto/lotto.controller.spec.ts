import { Test, TestingModule } from '@nestjs/testing';
import { LottoController } from './lotto.controller';
import { LottoService } from './lotto.service';

describe('LottoController', () => {
  let controller: LottoController;

  const mockLottoService = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findActiveOptions: jest.fn(),
    findAllCategories: jest.fn(),
    findOnlyAllow: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAllWithDeleted: jest.fn(),
    findOnlyDeleted: jest.fn(),
    findDeletedById: jest.fn(),
    countDeleted: jest.fn(),
    restore: jest.fn(),
    forceDelete: jest.fn(),
    forceDeleteOldRecords: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LottoController],
      providers: [{ provide: LottoService, useValue: mockLottoService }],
    }).compile();

    controller = module.get<LottoController>(LottoController);
  });

  it('findAll calls paginated service when pagination is present', async () => {
    await controller.findAll('2', '10', 'foo');

    expect(mockLottoService.findAllPaginated).toHaveBeenCalledWith(2, 10, 'foo');
  });

  it('findAll calls findAll when no pagination is provided', async () => {
    await controller.findAll(undefined, undefined, undefined);

    expect(mockLottoService.findAll).toHaveBeenCalledTimes(1);
  });

  it('countDeleted wraps number in object', async () => {
    mockLottoService.countDeleted.mockResolvedValue(9);

    await expect(controller.countDeleted()).resolves.toEqual({ count: 9 });
  });
});
