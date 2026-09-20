export type Locale = "en" | "es";

export const LOCALES: Locale[] = ["en", "es"];

export const translations = {
  en: {
    common: {
      languageName: "English",
    },
    nav: {
      brand: "snapshare",
      howItWorks: "How it works",
    },
    footer: {
      zeroKnowledgeTitle: "Zero knowledge",
      zeroKnowledgeBody:
        "AES-256-GCM in your browser. The server stores ciphertext only.",
      goneTitle: "Gone in 24h",
      goneBody: "Nothing lasts more than a day. Expired links are deleted.",
      burnTitle: "Burn on read",
      burnBody: "One view, then ash — or leave it until the timer runs out.",
      tagline:
        "Encrypted in your browser. Stored as ciphertext for at most 24 hours. We never see the secret.",
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
      burnOn: "On",
      burnOff: "Off",
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
    howItWorks: {
      eyebrow: "How it works",
      title: "We store ash, not the flame.",
      intro:
        "snapshare is a one-way drop for passwords, API keys, and tokens. The plaintext is encrypted on your device before anything is sent.",
      step1Title: "Sealed in the browser",
      step1Body:
        "Your secret is encrypted with AES-256-GCM using the Web Crypto API. A random 256-bit key is generated locally. The server receives only ciphertext, an IV, and expiry metadata.",
      step2Title: "The key never hits the server",
      step2Body:
        "Without a passphrase, the key lives in the URL fragment after #. Browsers do not send fragments to servers, so access logs never see it. Copy the full link — some chat apps strip that part.",
      step3Title: "Optional passphrase",
      step3Body:
        "If you set a passphrase, the encryption key is derived directly from it via PBKDF2 (600,000 iterations, SHA-256) — no key ever goes in the URL. The recipient needs the link and the phrase. The URL then has no fragment, which is safer in messengers.",
      step4Title: "Twenty-four hours, then deletion",
      step4Body:
        "Lifetime is 15 minutes, 1 hour, 6 hours, or 24 hours — never longer. Expired links are deleted. Burn-after-reading removes the ciphertext on the first successful open.",
      notTitle: "What this is not",
      notBody:
        "snapshare is not a password manager, not a backup, and not a place to keep secrets. If you lose the link (or the passphrase), it is gone. Do not send highly sensitive material over a channel you do not trust — the link is the capability.",
      cta: "Share a secret",
    },
  },
  es: {
    common: {
      languageName: "Español",
    },
    nav: {
      brand: "snapshare",
      howItWorks: "Cómo funciona",
    },
    footer: {
      zeroKnowledgeTitle: "Cero conocimiento",
      zeroKnowledgeBody:
        "AES-256-GCM en tu navegador. El servidor solo almacena texto cifrado.",
      goneTitle: "Desaparece en 24h",
      goneBody:
        "Nada dura más de un día. Los enlaces vencidos se eliminan.",
      burnTitle: "Se destruye al leer",
      burnBody:
        "Una vista y luego cenizas — o déjalo hasta que se acabe el tiempo.",
      tagline:
        "Cifrado en tu navegador. Almacenado como texto cifrado durante 24 horas como máximo. Nunca vemos el secreto.",
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
      burnOn: "Sí",
      burnOff: "No",
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
    howItWorks: {
      eyebrow: "Cómo funciona",
      title: "Guardamos las cenizas, no la llama.",
      intro:
        "snapshare es un buzón de una sola vía para contraseñas, claves de API y tokens. El texto plano se cifra en tu dispositivo antes de enviar nada.",
      step1Title: "Sellado en el navegador",
      step1Body:
        "Tu secreto se cifra con AES-256-GCM usando la Web Crypto API. Se genera localmente una clave aleatoria de 256 bits. El servidor recibe solo el texto cifrado, un IV y metadatos de expiración.",
      step2Title: "La clave nunca llega al servidor",
      step2Body:
        "Sin una frase secreta, la clave vive en el fragmento de la URL después de #. Los navegadores no envían fragmentos a los servidores, así que los registros de acceso nunca la ven. Copia el enlace completo — algunas apps de chat eliminan esa parte.",
      step3Title: "Frase secreta opcional",
      step3Body:
        "Si estableces una frase secreta, la clave de cifrado se deriva directamente de ella mediante PBKDF2 (600.000 iteraciones, SHA-256) — ninguna clave viaja en la URL. El destinatario necesita el enlace y la frase. La URL entonces no tiene fragmento, lo cual es más seguro en mensajería.",
      step4Title: "Veinticuatro horas y luego se elimina",
      step4Body:
        "La duración es de 15 minutos, 1 hora, 6 horas o 24 horas — nunca más. Los enlaces vencidos se eliminan. Destruir tras leer elimina el texto cifrado en la primera apertura exitosa.",
      notTitle: "Lo que esto no es",
      notBody:
        "snapshare no es un gestor de contraseñas, ni una copia de seguridad, ni un lugar para guardar secretos. Si pierdes el enlace (o la frase secreta), desaparece. No envíes material muy sensible por un canal en el que no confías — el enlace es la llave.",
      cta: "Compartir un secreto",
    },
  },
} as const;

export type Translations = (typeof translations)[Locale];
