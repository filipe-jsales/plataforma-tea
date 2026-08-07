import { Repository } from 'typeorm';
import { ExportAuditLog } from './entities/export-audit-log.entity';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<Repository<ExportAuditLog>>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExportAuditLog>>;

    service = new AuditService(repository);
  });

  describe('recordExport', () => {
    it('persists who exported, what was filtered, and the row count', async () => {
      repository.create.mockImplementation(
        (entity) => entity as ExportAuditLog,
      );
      repository.save.mockImplementation(
        async (entity) => entity as ExportAuditLog,
      );

      await service.recordExport({
        adminUserId: 'admin-1',
        filters: {
          schoolId: 'school-1',
          challengeId: null,
          from: null,
          to: null,
          format: 'json',
        },
        rowCount: 42,
      });

      expect(repository.create).toHaveBeenCalledWith({
        adminUserId: 'admin-1',
        filters: {
          schoolId: 'school-1',
          challengeId: null,
          from: null,
          to: null,
          format: 'json',
        },
        rowCount: 42,
      });
      expect(repository.save).toHaveBeenCalled();
    });
  });
});
