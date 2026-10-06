import './AppFooter.css';

// Contato/direitos globais (todas as telas autenticadas). E-mail é um
// placeholder de contato institucional - trocar pelo canal real de suporte
// da plataforma quando definido, nunca um endereço de pessoa física.
const CONTACT_EMAIL = 'contato@plataforma-tea.com.br';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p className="app-footer__contact">
        Contato: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <p className="app-footer__rights">© {year} Plataforma TEA. Todos os direitos reservados.</p>
    </footer>
  );
}
