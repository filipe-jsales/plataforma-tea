import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { logEvent } from '../lib/logEvent';
import { useAuthStore, type SessionUser } from '../stores/useAuthStore';
import { useSensoryProfileStore } from '../stores/useSensoryProfileStore';
import { Button, ToggleSwitch } from '../components/ui';
import './OnboardingSensorial.css';

// 2.2 — Onboarding sensorial do aluno. Regra não-negociável 1: tudo nasce
// OFF. Esta tela em si não anima nem toca som (AC7) — nenhum exemplo
// "vendendo" a opção. Ícone + texto sempre juntos (AC3 / RQ4 acessibilidade
// de interface).
export function OnboardingSensorial() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setMotionEnabled = useSensoryProfileStore((state) => state.setMotionEnabled);
  const setSoundEnabled = useSensoryProfileStore((state) => state.setSoundEnabled);

  const [soundEnabled, setSoundChoice] = useState(false);
  const [animationEnabled, setAnimationChoice] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return null;
  }
  const currentUser = user;

  async function handleConfirm() {
    setSaving(true);
    try {
      const updated = await apiClient.patch<SessionUser>(
        `/users/${currentUser.id}/sensory-profile`,
        { soundEnabled, animationEnabled },
      );
      updateUser(updated);
      // Aplica na hora, sem precisar recarregar (AC4) — o tema sensorial
      // (data-motion/data-sound no <html>) reage imediatamente.
      setMotionEnabled(animationEnabled);
      setSoundEnabled(soundEnabled);
      logEvent({
        studentPseudoId: currentUser.pseudonymId,
        category: 'RD-E',
        type: 'sensory_onboarding_completed',
        payload: { soundEnabled, animationEnabled },
      });
      navigate('/home', { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-sensorial">
      <h1>Antes de começar</h1>
      <p>Você decide como quer usar a plataforma. Pode mudar isso depois.</p>

      <div className="onboarding-sensorial__options">
        <ToggleSwitch
          id="onboarding-sound"
          icon="🔊"
          label="Quer som?"
          checked={soundEnabled}
          onCheckedChange={setSoundChoice}
        />

        <ToggleSwitch
          id="onboarding-animation"
          icon="✨"
          label="Quer animação?"
          checked={animationEnabled}
          onCheckedChange={setAnimationChoice}
        />
      </div>

      <Button onClick={handleConfirm} disabled={saving}>
        {saving ? 'Salvando…' : 'Continuar'}
      </Button>
    </main>
  );
}
