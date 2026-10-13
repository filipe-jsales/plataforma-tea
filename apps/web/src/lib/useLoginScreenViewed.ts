import { useEffect } from 'react';
import { logLoginScreenViewed, type LoginScreen } from './logEvent';

// `login_screen_viewed` (RD-I, pré-login): 1 evento por montagem da tela.
export function useLoginScreenViewed(screen: LoginScreen): void {
  useEffect(() => {
    logLoginScreenViewed(screen);
  }, [screen]);
}
