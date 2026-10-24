/* Configuración pública del sitio (sin secretos: las claves de Firebase son públicas por diseño;
   la seguridad la dan las reglas de la base de datos, ver docs/firebase-rules.json). */
window.CONFIG = {
  // Correo que recibe TODO: sugerencias de platos, cuentas nuevas y calendarios guardados.
  adminEmail: "jaemeson.dieu@gmail.com",
  // URL del Apps Script desplegado como "aplicación web" (ver docs/apps-script.gs y README).
  // Mientras esté vacío, las sugerencias se mandan con mailto: y no hay avisos de cuentas/calendarios.
  // Proxy de precios (Cloudflare Worker, ver tools/worker). Vacío = el buscador en vivo queda desactivado.
  priceApi: "https://plan-comidas-precios.jaemeson-dieu.workers.dev",
  notifyUrl: "https://script.google.com/macros/s/AKfycbxZcgnTWwKDyOQgLyyx0X7fsRtk1tcOHXQd4jz1c5OtZN4EXqwBxliiJ5wPbxtUcGqxWQ/exec",
  // Personas de ejemplo en la ladder (no son cuentas: se generan en el navegador, ver DEMO en cuenta.js). false = ocultarlas.
  demoLadder: true,
  // reCAPTCHA v2 («No soy un robot») para crear cuenta. Clave del SITIO (pública); la secreta va en el Worker.
  // Vacía = se usa la suma de control local.
  recaptchaSiteKey: "",
  // Proyecto Firebase existente (viaje-del-amor): Authentication (email + contraseña) + Realtime Database.
  firebase: {
    apiKey: "AIzaSyDby2S1qUHAChX_RwqPRLkU8qgpmsSvQWg",
    authDomain: "viaje-del-amor.firebaseapp.com",
    databaseURL: "https://viaje-del-amor-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "viaje-del-amor",
    appId: "1:1022626936571:web:40912f37c6f05cf7b8625e",
  },
};
