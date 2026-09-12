export type Locale = "en" | "es";

export const LOCALES: Locale[] = ["en", "es"];

export const translations = {
  en: {
    common: {
      languageName: "English",
    },
    home: {
      intro:
        "Send a password, API key, or token. It's encrypted here, in this browser, and never lives longer than 24 hours.",
      secretLabel: "Secret",
      secretPlaceholder: "Paste a password, API key, token, or private note",
      keyboardHint: "⌘/Ctrl + Enter to create the link",
      lifetimeLabel: "Lifetime",
      lifetime15min: "15 min",
      lifetime1hour: "1 hour",
      lifetime6hours: "6 hours",
      lifetime24hours: "24 hours",
      burnLabel: "Burn after reading",
      burnDescription: "Destroyed as soon as it's opened",
      passphraseLabel: "Passphrase (optional)",
      passphrasePlaceholder: "Only people with this phrase can open it",
      passphraseHint:
        "With a passphrase, the link carries no key — safer in chat apps that strip the # fragment.",
      showPassphrase: "Show passphrase",
      hidePassphrase: "Hide passphrase",
      createButton: "Create link",
      creatingButton: "Creating link…",
      resultTitle: "Link created",
      resultBurnTrue:
        "This link works once. It's gone as soon as it's opened, or in {lifetime}, whichever comes first.",
      resultBurnFalse:
        "This link stays available for {lifetime}, and can be opened more than once.",
      copyButton: "Copy",
      copiedButton: "Copied",
      createAnotherButton: "Create another secret",
      genericError: "Something went wrong. Try again.",
    },
    view: {
      fetchingMessage: "Fetching and decrypting…",
      notFoundError: "This link has already been opened, or it's expired.",
      keyMissingError: "The decryption key is missing from this link.",
      passphraseTitle: "This link needs a passphrase",
      passphraseInputPlaceholder: "Enter the passphrase",
      unlockButton: "Unlock",
      unlockingButton: "Unlocking…",
      incorrectPassphrase: "That passphrase doesn't match. Try again.",
      secretTitle: "Your secret",
      secretBurnedNotice: "This link is now gone — it can't be opened again.",
      secretPersistsNotice: "This link stays available until it expires.",
    },
  },
  es: {
    common: {
      languageName: "Español",
    },
    home: {
      intro:
        "Envía una contraseña, clave de API o token. Se cifra aquí, en este navegador, y nunca dura más de 24 horas.",
      secretLabel: "Secreto",
      secretPlaceholder: "Pega una contraseña, clave de API, token o nota privada",
      keyboardHint: "⌘/Ctrl + Enter para crear el enlace",
      lifetimeLabel: "Duración",
      lifetime15min: "15 min",
      lifetime1hour: "1 hora",
      lifetime6hours: "6 horas",
      lifetime24hours: "24 horas",
      burnLabel: "Destruir tras leer",
      burnDescription: "Se destruye en cuanto se abre",
      passphraseLabel: "Frase secreta (opcional)",
      passphrasePlaceholder: "Solo quien tenga esta frase podrá abrirlo",
      passphraseHint:
        "Con una frase secreta, el enlace no lleva la clave — más seguro en apps de chat que eliminan el fragmento #.",
      showPassphrase: "Mostrar frase secreta",
      hidePassphrase: "Ocultar frase secreta",
      createButton: "Crear enlace",
      creatingButton: "Creando enlace…",
      resultTitle: "Enlace creado",
      resultBurnTrue:
        "Este enlace funciona una sola vez. Desaparece en cuanto se abre, o en {lifetime}, lo que ocurra primero.",
      resultBurnFalse:
        "Este enlace estará disponible durante {lifetime} y puede abrirse más de una vez.",
      copyButton: "Copiar",
      copiedButton: "Copiado",
      createAnotherButton: "Crear otro secreto",
      genericError: "Algo salió mal. Inténtalo de nuevo.",
    },
    view: {
      fetchingMessage: "Obteniendo y descifrando…",
      notFoundError: "Este enlace ya fue abierto, o ha expirado.",
      keyMissingError: "Falta la clave de descifrado en este enlace.",
      passphraseTitle: "Este enlace necesita una frase secreta",
      passphraseInputPlaceholder: "Escribe la frase secreta",
      unlockButton: "Desbloquear",
      unlockingButton: "Desbloqueando…",
      incorrectPassphrase: "Esa frase secreta no coincide. Inténtalo de nuevo.",
      secretTitle: "Tu secreto",
      secretBurnedNotice: "Este enlace ya desapareció — no puede abrirse de nuevo.",
      secretPersistsNotice: "Este enlace seguirá disponible hasta que expire.",
    },
  },
} as const;

export type Translations = (typeof translations)[Locale];
