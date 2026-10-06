import avatarBird from '../assets/illustrations/avatar-bird.svg';
import avatarCat from '../assets/illustrations/avatar-cat.svg';
import avatarDog from '../assets/illustrations/avatar-dog.svg';
import avatarFish from '../assets/illustrations/avatar-fish.svg';
import loginMoon from '../assets/illustrations/login-moon.svg';
import loginStar from '../assets/illustrations/login-star.svg';
import loginSun from '../assets/illustrations/login-sun.svg';
import loginTree from '../assets/illustrations/login-tree.svg';

// Mapeamento único assetRef (string vinda do banco, ver illustrations.entity.ts)
// → arquivo estático do frontend. Ver NOTICE.md na pasta de assets para
// origem/licença. Nunca importar os SVGs diretamente fora daqui - assim
// trocar o arquivo de um assetRef é uma mudança em um lugar só.
const ILLUSTRATION_ASSETS: Record<string, string> = {
  'avatar-cat': avatarCat,
  'avatar-dog': avatarDog,
  'avatar-bird': avatarBird,
  'avatar-fish': avatarFish,
  'login-sun': loginSun,
  'login-moon': loginMoon,
  'login-star': loginStar,
  'login-tree': loginTree,
};

// Fallback visível (não crash silencioso) se o banco tiver um assetRef sem
// arquivo correspondente ainda - um SVG cinza com "?" é preferível a uma
// tela quebrada.
const FALLBACK_ASSET =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<circle cx="32" cy="32" r="32" fill="#9AA0A6"/>' +
      '<text x="32" y="42" font-size="28" text-anchor="middle" fill="#fff" font-family="sans-serif">?</text>' +
      '</svg>',
  );

export function getIllustrationAsset(assetRef: string): string {
  return ILLUSTRATION_ASSETS[assetRef] ?? FALLBACK_ASSET;
}
