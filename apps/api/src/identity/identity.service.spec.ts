import { Repository } from 'typeorm';
import { StudentIdentityReversal } from './entities/student-identity-reversal.entity';
import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  let service: IdentityService;
  let repository: jest.Mocked<Repository<StudentIdentityReversal>>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<StudentIdentityReversal>>;

    service = new IdentityService(repository);
  });

  it('createReversal defaults schoolReversibleRef to null when omitted', async () => {
    repository.create.mockImplementation((entity) => entity as StudentIdentityReversal);
    repository.save.mockImplementation(async (entity) => entity as StudentIdentityReversal);

    await service.createReversal({
      userId: 'user-1',
      pseudonymId: 'pseudo-1',
      schoolId: 'school-1',
    });

    expect(repository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      pseudonymId: 'pseudo-1',
      schoolId: 'school-1',
      schoolReversibleRef: null,
    });
  });

  it('reveal looks up the reversal by pseudonymId', async () => {
    repository.findOne.mockResolvedValue(null);

    await service.reveal('pseudo-1');

    expect(repository.findOne).toHaveBeenCalledWith({ where: { pseudonymId: 'pseudo-1' } });
  });
});
