import { VisuallyHidden } from 'react-aria';

// Re-exportado daqui (não direto de `react-aria` nas telas) pra manter um
// único ponto de import do design system, mesmo raciocínio de todo outro
// arquivo em components/ui/ — se um dia trocarmos a implementação, telas
// que já importam de `components/ui` não precisam mudar.
export { VisuallyHidden };
