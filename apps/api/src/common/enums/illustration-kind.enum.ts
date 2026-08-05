export enum IllustrationKind {
  // Identidade visual do aluno em listas/roster — nunca foto real.
  AVATAR = 'avatar',
  // Credencial do fluxo de login por sequência de imagens — pool separado
  // do avatar de propósito, para não confundir "quem eu sou" com "minha senha".
  LOGIN_IMAGE = 'login_image',
}
