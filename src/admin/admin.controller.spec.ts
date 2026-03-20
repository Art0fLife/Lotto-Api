import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;

  const mockAdminService = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findNonSuperadminOptions: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAllWithDeleted: jest.fn(),
    findOnlyDeleted: jest.fn(),
    findDeletedById: jest.fn(),
    countDeleted: jest.fn(),
    restore: jest.fn(),
    restoreByEmail: jest.fn(),
    forceDelete: jest.fn(),
    forceDeleteOldRecords: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('calls paginated findAll when page or limit is provided', async () => {
    mockAdminService.findAllPaginated.mockResolvedValue({ data: [] });

    await controller.findAll('2', '20', 'foo');

    expect(mockAdminService.findAllPaginated).toHaveBeenCalledWith(2, 20, 'foo');
    expect(mockAdminService.findAll).not.toHaveBeenCalled();
  });

  it('calls findAll when no pagination query is provided', async () => {
    mockAdminService.findAll.mockResolvedValue([]);

    await controller.findAll(undefined, undefined, undefined);

    expect(mockAdminService.findAll).toHaveBeenCalledTimes(1);
  });

  it('returns deleted count object', async () => {
    mockAdminService.countDeleted.mockResolvedValue(5);

    await expect(controller.countDeleted()).resolves.toEqual({ count: 5 });
  });
});
