import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsService: jest.Mocked<SettingsService>;

  beforeEach(() => {
    settingsService = {
      getOrCreate: jest.fn(),
      updateMinSampleSizeThreshold: jest.fn(),
    } as unknown as jest.Mocked<SettingsService>;

    controller = new SettingsController(settingsService);
  });

  it('getSettings delegates straight to the service', async () => {
    const settings = { id: 's1', minSampleSizeThreshold: 5 } as any;
    settingsService.getOrCreate.mockResolvedValue(settings);

    await expect(controller.getSettings()).resolves.toBe(settings);
  });

  it('updateSettings passes the DTO value through to the service', async () => {
    const settings = { id: 's1', minSampleSizeThreshold: 10 } as any;
    settingsService.updateMinSampleSizeThreshold.mockResolvedValue(settings);

    const result = await controller.updateSettings({ minSampleSizeThreshold: 10 });

    expect(settingsService.updateMinSampleSizeThreshold).toHaveBeenCalledWith(10);
    expect(result).toBe(settings);
  });
});
