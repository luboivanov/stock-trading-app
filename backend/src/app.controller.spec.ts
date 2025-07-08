import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getBestTrade: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
    appService = moduleRef.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  it('should call service.getBestTrade with correct params and return result', async () => {
    const mockResult = {
      buyTime: 't1',
      sellTime: 't2',
      buyPrice: 1,
      sellPrice: 2,
    };
    const spy = jest
      .spyOn(appService, 'getBestTrade')
      .mockResolvedValue(mockResult);
    const result = await appController.getBestTrade('start', 'end');
    expect(spy).toHaveBeenCalled();
    expect(result).toBe(mockResult);
  });
});

describe('AppModule', () => {
  it('should compile the module', async () => {
    const { AppModule } = await import('./app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(moduleRef).toBeDefined();
    expect(moduleRef.get(AppController)).toBeInstanceOf(AppController);
    expect(moduleRef.get(AppService)).toBeInstanceOf(AppService);
  });
});
