// F16 - leitura em voz alta do enunciado via Web Speech API do próprio
// navegador (nenhuma dependência nova, nenhum áudio sai do aparelho). Tudo
// aqui é defensivo: navegador sem suporte ou sem voz instalada vira "não
// mostrar o botão", nunca um erro na tela do aluno.
export const SPEECH_LANG = 'pt-BR';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export interface SpeakHandlers {
  onEnd?: () => void;
}

// Sempre cancela a fala anterior antes de começar: duas vozes ao mesmo tempo
// seria exatamente o tipo de ruído sensorial que a plataforma evita.
export function speak(text: string, handlers: SpeakHandlers = {}): void {
  if (!isSpeechSupported() || !text.trim()) {
    handlers.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG;
  // Um pouco mais devagar que o padrão: ritmo previsível, sem pressa.
  utterance.rate = 0.9;
  utterance.onend = () => handlers.onEnd?.();
  utterance.onerror = () => handlers.onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}
