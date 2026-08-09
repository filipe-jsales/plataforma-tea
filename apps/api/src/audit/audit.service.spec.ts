import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { AdminActionLog } from './entities/admin-action-log.entity';
import { ExportAuditLog } from './entities/export-audit-log.entity';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<Repository<ExportAuditLog>>;
  let adminActionLogRepository: jest.Mocked<Repository<AdminActionLog>>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExportAuditLog>>;
    adminActionLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<AdminActionLog>>;

    service = new AuditService(repository, adminActionLogRepository);
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

  describe('recordUserAction', () => {
    it('1.4 — persists who did what to whom, defaulting metadata to {}', async () => {
      adminActionLogRepository.create.mockImplementation(
        (entity) => entity as AdminActionLog,
      );
      adminActionLogRepository.save.mockImplementation(
        async (entity) => entity as AdminActionLog,
      );

      await service.recordUserAction({
        actorUserId: 'admin-1',
        actorRole: Role.ADMIN,
        actionType: 'deactivate',
        targetUserId: 'user-1',
        targetRole: Role.TEACHER,
      });

      expect(adminActionLogRepository.create).toHaveBeenCalledWith({
        actorUserId: 'admin-1',
        actorRole: Role.ADMIN,
        actionType: 'deactivate',
        targetUserId: 'user-1',
        targetRole: Role.TEACHER,
        metadata: {},
      });
      expect(adminActionLogRepository.save).toHaveBeenCalled();
    });
  });
});
