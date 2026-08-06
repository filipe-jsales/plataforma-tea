import { User } from './user.entity';

describe('User entity', () => {
  describe('generatePseudonymId', () => {
    it('assigns a pseudonymId when none is set', () => {
      const user = new User();

      user.generatePseudonymId();

      expect(user.pseudonymId).toEqual(expect.any(String));
      expect(user.pseudonymId.length).toBeGreaterThan(0);
    });

    it('never overwrites a pseudonymId set explicitly (e.g. by a seed migration)', () => {
      const user = new User();
      user.pseudonymId = 'seed-fixed-pseudonym';

      user.generatePseudonymId();

      expect(user.pseudonymId).toBe('seed-fixed-pseudonym');
    });
  });
});
