import { useState } from 'react';
import { ArrowLeft, Sparkles, Volume2 } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { logEvent } from '../lib/logEvent';
import { useAuthStore, type SessionUser } from '../stores/useAuthStore';
import { useSensoryProfileStore } from '../stores/useSensoryProfileStore';
import { Button, InlineFeedback, LinkButton, ToggleSwitch } from '../components/ui';
import './OnboardingSensorial.css';

// 3.9 — mesmas duas opções de OnboardingSensorial (2.2), mas revisitável
// pelo próprio aluno a qualquer momento, não só na primeira sessão.
// Reaproveita o mesmo endpoint (PATCH /users/:id/sensory-profile já aceita
// `isSelf`, ver UsersController) — salvar aqui nunca reabre o onboarding
// nem mexe em `sensoryOnboardingCompletedAt`
// (UsersService.updateSensoryProfile só marca isso na primeira vez).
export function StudentSensorySettings() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setMotionEnabled = useSensoryProfileStore((state) => state.setMotionEnabled);
  const setSoundEnabledGlobal = useSensoryProfileStore((state) => state.setSoundEnabled);

  const [soundEnabled, setSoundChoice] = useState(user?.soundEnabled ?? false);
  const [animationEnabled, setAnimationChoice] = useState(user?.animationEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) {
    return null;
  }
  const currentUser = user;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await apiClient.patch<SessionUser>(
        `/users/${currentUser.id}/sensory-profile`,
        { soundEnabled, animationEnabled },
      );
      updateUser(updated);
      // Aplica na hora, sem precisar recarregar — mesmo comportamento do
      // onboarding (AC4 de 2.2).
      setMotionEnabled(animationEnabled);
      setSoundEnabledGlobal(soundEnabled);
      logEvent({
        studentPseudoId: currentUser.pseudonymId,
        category: 'RD-E',
        type: 'sensory_settings_updated',
        payload: { soundEnabled, animationEnabled },
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-sensorial">
      <LinkButton to="/home" variant="secondary" icon={<ArrowLeft size={20} />}>
        Voltar
      </LinkButton>
      <h1>Minhas configurações</h1>
      <p>Você pode mudar isso quando quiser, quantas vezes quiser.</p>

      <div className="onboarding-sensorial__options">
        <ToggleSwitch
          id="settings-sound"
          icon={<Volume2 size={20} />}
          label="Quer som?"
          checked={soundEnabled}
          onCheckedChange={setSoundChoice}
        />

        <ToggleSwitch
          id="settings-animation"
          icon={<Sparkles size={20} />}
          label="Quer animação?"
          checked={animationEnabled}
          onCheckedChange={setAnimationChoice}
        />
      </div>

      {saved && <InlineFeedback kind="success">Salvo.</InlineFeedback>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </main>
  );
}
