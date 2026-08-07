import { Repository } from 'typeorm';
import { PlatformSetting } from './entities/platform-setting.entity';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let repository: jest.Mocked<Repository<PlatformSetting>>;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<PlatformSetting>>;

    service = new SettingsService(repository);
  });

  describe('getOrCreate', () => {
    it('returns the existing singleton row when one already exists', async () => {
      const existing = { id: 's1', minSampleSizeThreshold: 7, updatedAt: new Date() };
      repository.find.mockResolvedValue([existing]);

      const result = await service.getOrCreate();

      expect(result).toBe(existing);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('lazily creates the row with the default threshold (5) when none exists yet', async () => {
      repository.find.mockResolvedValue([]);
      const created = { minSampleSizeThreshold: 5 } as PlatformSetting;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue({ ...created, id: 's1', updatedAt: new Date() } as PlatformSetting);

      const result = await service.getOrCreate();

      expect(repository.create).toHaveBeenCalledWith({ minSampleSizeThreshold: 5 });
      expect(result.minSampleSizeThreshold).toBe(5);
    });
  });

  describe('updateMinSampleSizeThreshold', () => {
    it('updates the existing singleton row in place', async () => {
      const existing = { id: 's1', minSampleSizeThreshold: 5, updatedAt: new Date() };
      repository.find.mockResolvedValue([existing]);
      repository.save.mockImplementation(async (entity) => entity as PlatformSetting);

      const result = await service.updateMinSampleSizeThreshold(9);

      expect(result.minSampleSizeThreshold).toBe(9);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ minSampleSizeThreshold: 9 }));
    });

    it('creates the row first (with the new value) when none exists yet', async () => {
      repository.find.mockResolvedValue([]);
      repository.create.mockReturnValue({ minSampleSizeThreshold: 5 } as PlatformSetting);
      repository.save.mockImplementation(async (entity) => entity as PlatformSetting);

      const result = await service.updateMinSampleSizeThreshold(3);

      expect(result.minSampleSizeThreshold).toBe(3);
    });
  });
});
