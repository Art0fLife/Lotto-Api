import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BillController } from './bill.controller';
import { BillService } from './bill.service';

describe('BillController', () => {
  let controller: BillController;

  const mockBillService = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    findOneWithBets: jest.fn(),
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
      controllers: [BillController],
      providers: [{ provide: BillService, useValue: mockBillService }],
    }).compile();

    controller = module.get<BillController>(BillController);
  });

  it('findAll routes to paginated when page or limit is present', async () => {
    await controller.findAll({ user: { sub: 1, roleId: 2 } }, '2', '10', 'foo');

    expect(mockBillService.findAllPaginated).toHaveBeenCalledWith(2, 10, 'foo', undefined, undefined, 1, 2);
  });

  it('dataList normalizes orderBy/order to arrays', async () => {
    await controller.dataList(
      { user: { sub: 1, roleId: 1 } },
      {
        page: 2,
        limit: 5,
        search: 'x',
        orderBy: 'billId',
        order: 'asc',
      },
    );

    expect(mockBillService.findAllPaginated).toHaveBeenCalledWith(
      2,
      5,
      'x',
      ['billId'],
      ['asc'],
      1,
      1,
      expect.any(Object),
    );
  });

  it('deleteViaPostBody throws for invalid bill id', async () => {
    await expect(controller.deleteViaPostBody({ id: '' } as any)).rejects.toThrow(
      new BadRequestException('Invalid bill id'),
    );
  });
});
