import Ad from "./ad";

function Footer() {
  return (
    <>
      <div className="w-full max-w-[800px] px-2 flex flex-col gap-4 mb-4">
        <Ad />
      </div>
      <footer className="bottom-0 p-4 flex flex-col items-center space-y-1">
        <p>Ver.: 1.4.4</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          <a
            className="text-purple-600 font-semibold"
            href="https://filipeleonelbatista.github.io/minhas-financas-v2-ai/termos.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Termos de Uso
          </a>
          <a
            className="text-purple-600 font-semibold"
            href="https://filipeleonelbatista.github.io/minhas-financas-v2-ai/privacidade.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacidade
          </a>
          <a
            className="text-purple-600 font-semibold"
            href="https://expo.dev/artifacts/eas/TZqom4Tv-08itde1qFPitkLQYaV2-kWLxOkX87niyHU.apk"
            target="_blank"
            rel="noopener noreferrer"
          >
            Baixar APK Android
          </a>
        </nav>
        {/* <a
          href="https://play.google.com/store/apps/details?id=com.finances"
          className="text-purple-600 font-semibold text-center"
        >
          Finanças - Controle seus gastos (Baixe o app Android)
        </a> */}
        <p>
          Desenvolvido com ❤️ por{" "}
          <a
            className="text-purple-600 font-semibold"
            href="https://filipeleonelbatista.github.io/"
          >
            Filipe Batista
          </a>
        </p>
      </footer>
    </>
  );
}

export default Footer;
