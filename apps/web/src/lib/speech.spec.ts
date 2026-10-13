import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isSpeechSupported, speak, stopSpeaking } from './speech';

class FakeUtterance {
  text: string;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

describe('speech (F16)', () => {
  const speakSpy = vi.fn();
  const cancelSpy = vi.fn();

  function installSpeech() {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: speakSpy, cancel: cancelSpy },
    });
  }

  beforeEach(() => {
    speakSpy.mockReset();
    cancelSpy.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'speechSynthesis');
  });

  it('reports no support when the browser has no speech synthesis', () => {
    expect(isSpeechSupported()).toBe(false);
  });

  it('reports support when both the engine and the utterance class exist', () => {
    installSpeech();

    expect(isSpeechSupported()).toBe(true);
  });

  it('speaks in pt-BR at a slightly slower, predictable pace', () => {
    installSpeech();

    speak('Monte o quadrado.');

    const utterance = speakSpy.mock.calls[0][0] as FakeUtterance;
    expect(utterance.text).toBe('Monte o quadrado.');
    expect(utterance.lang).toBe('pt-BR');
    expect(utterance.rate).toBeLessThan(1);
  });

  it('cancels any voice already playing before starting a new one (never two voices at once)', () => {
    installSpeech();

    speak('primeiro');

    expect(cancelSpy).toHaveBeenCalledBefore(speakSpy);
  });

  it('calls onEnd when the voice finishes and also when it errors, so the UI never stays stuck on "speaking"', () => {
    installSpeech();
    const onEnd = vi.fn();

    speak('texto', { onEnd });
    const utterance = speakSpy.mock.calls[0][0] as FakeUtterance;
    utterance.onend?.();
    utterance.onerror?.();

    expect(onEnd).toHaveBeenCalledTimes(2);
  });

  it('does nothing (but still calls onEnd) for blank text or an unsupported browser', () => {
    const onEnd = vi.fn();

    speak('texto', { onEnd });
    installSpeech();
    speak('   ', { onEnd });

    expect(speakSpy).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(2);
  });

  it('stopSpeaking cancels the voice and is a safe no-op without support', () => {
    expect(() => stopSpeaking()).not.toThrow();
    installSpeech();

    stopSpeaking();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
