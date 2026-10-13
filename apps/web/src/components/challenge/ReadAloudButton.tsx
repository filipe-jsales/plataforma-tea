import { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { isSpeechSupported, speak, stopSpeaking } from '../../lib/speech';
import { useReadingPrefsStore } from '../../stores/useReadingPrefsStore';
import { Button } from '../ui';

export interface ReadAloudButtonProps {
  text: string;
  // Chamado a cada vez que o aluno MANDA ler (não ao parar) - o log fica a
  // cargo da tela, que conhece o desafio.
  onRead?: () => void;
}

// F16 - leitura do enunciado em voz alta, opt-in. Só aparece se o aluno
// ligou "Ouvir o enunciado" nas configurações E o navegador sabe falar; nunca
// fala sozinho (regra 1: som nasce desligado), só quando o aluno aperta, e
// aperta de novo para parar. Sai de cena e para a voz ao trocar de desafio.
export function ReadAloudButton({ text, onRead }: ReadAloudButtonProps) {
  const enabled = useReadingPrefsStore((state) => state.readAloudEnabled);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      stopSpeaking();
      setSpeaking(false);
    };
  }, [text]);

  if (!enabled || !isSpeechSupported() || !text.trim()) return null;

  function handleClick() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    onRead?.();
    speak(text, { onEnd: () => setSpeaking(false) });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      icon={speaking ? <Square /> : <Volume2 />}
      onClick={handleClick}
    >
      {speaking ? 'Parar de ouvir' : 'Ouvir o enunciado'}
    </Button>
  );
}
