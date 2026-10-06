// A2 (AC4) - mesma forma que GET /admin/students/:id/guardian-consent
// devolve.
export interface GuardianConsentAdminView {
  recorded: boolean;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianContact: string | null;
  consentedAt: string | null;
  collectedByDisplayName: string | null;
}
