import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService({} as any);
  });

  it('returns hello message', () => {
    expect(service.getHello()).toContain('NestJS API');
  });
});
