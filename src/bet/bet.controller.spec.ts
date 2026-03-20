import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';

describe('BetController', () => {
  let controller: BetController;

  const mockBetService = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    findOneWithRelations: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BetController],
      providers: [{ provide: BetService, useValue: mockBetService }],
    }).compile();

    controller = module.get<BetController>(BetController);
  });

  it('findAll routes to paginated service when page/limit exists', async () => {
    await controller.findAll({ user: { sub: 1, roleId: 2 } }, '2', '10', 'foo');

    expect(mockBetService.findAllPaginated).toHaveBeenCalledWith(2, 10, 'foo', undefined, undefined, 1, 2);
  });

  it('findOne throws when bet is not found', async () => {
    mockBetService.findOneWithRelations.mockResolvedValue(null);

    await expect(controller.findOne('1')).rejects.toThrow(new BadRequestException('Bet not found'));
  });

  it('update throws when owner mismatch and non-superadmin', async () => {
    mockBetService.findOne.mockResolvedValue({ adminId: 9 });

    await expect(
      controller.update('1', { user: { sub: 1, roleId: 2 } }, { amount: 100 } as any),
    ).rejects.toThrow(new BadRequestException('You do not have permission to update this bet'));
  });

  it('deleteViaPostBody validates id', async () => {
    await expect(controller.deleteViaPostBody({ id: '' } as any)).rejects.toThrow(
      new BadRequestException('Invalid bet id'),
    );
  });
});
