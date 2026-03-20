import { Test, TestingModule } from '@nestjs/testing';
import { LimitNumbersController } from './limit-numbers.controller';
import { LimitNumbersService } from './limit-numbers.service';

describe('LimitNumbersController', () => {
  let controller: LimitNumbersController;

  const mockService = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    deleteByCodes: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LimitNumbersController],
      providers: [{ provide: LimitNumbersService, useValue: mockService }],
    }).compile();

    controller = module.get<LimitNumbersController>(LimitNumbersController);
  });

  it('dataList parses numeric pagination', async () => {
    await controller.dataList({ page: '2', limit: '25', lotto_ticket_id: '7', code: '12' });

    expect(mockService.findAllPaginated).toHaveBeenCalledWith(2, 25, '7', '12', undefined, undefined);
  });

  it('create handles array payload via createMany', async () => {
    await controller.create([{ lottoTicketId: '1', code: 12 } as any]);

    expect(mockService.createMany).toHaveBeenCalledWith([{ lottoTicketId: 1, code: '12' }]);
  });

  it('create handles batch add/delete payload', async () => {
    mockService.createMany.mockResolvedValue({ count: 2 });
    mockService.deleteByCodes.mockResolvedValue({ count: 1 });

    const result = await controller.create({
      add: [{ lottoTicketId: '1', code: '12' }],
      delete: [{ lottoTicketId: '1', code: '34' }],
    });

    expect(mockService.createMany).toHaveBeenCalled();
    expect(mockService.deleteByCodes).toHaveBeenCalledWith(1, ['34']);
    expect(result).toEqual({ add: { count: 2 }, delete: { '1': { count: 1 } } });
  });
});
