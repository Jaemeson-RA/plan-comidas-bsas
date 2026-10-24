/**
 * Plan de comidas · Buenos Aires — reenvío de eventos por correo.
 *
 * Qué hace: recibe por POST los eventos del sitio (sugerencias de platos, cuentas nuevas,
 * calendarios guardados, recetas e ingredientes creados) y los manda por correo a ADMIN.
 *
 * Cómo desplegarlo (5 minutos, una sola vez, con la cuenta jaemeson.dieu@gmail.com):
 *  1. https://script.google.com → Nuevo proyecto → pegar este archivo completo.
 *  2. Implementar → Nueva implementación → tipo "Aplicación web".
 *     - Ejecutar como: "Yo" (jaemeson.dieu@gmail.com)
 *     - Quién tiene acceso: "Cualquier persona"
 *  3. Autorizar los permisos (Gmail) cuando lo pida.
 *  4. Copiar la URL que termina en /exec y pegarla en config.js → notifyUrl.
 *  5. git commit + push. Listo: cada evento llega a la casilla.
 *
 * Límite de Gmail para cuentas personales: 100 correos por día. De sobra para esto.
 */
var ADMIN = "jaemeson.dieu@gmail.com";

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents || "{}"); } catch (err) { d = { type: "desconocido", raw: e.postData && e.postData.contents }; }
  var tipo = String(d.type || "evento");
  var titulos = { sugerencia: "Sugerencia de plato", nueva_cuenta: "Cuenta nueva", calendario: "Calendario guardado", receta: "Receta nueva", ingrediente: "Ingrediente nuevo" };
  var asunto = "[Plan de comidas] " + (titulos[tipo] || tipo) + (d.title ? " · " + d.title : "");
  var lineas = [];
  Object.keys(d).forEach(function (k) {
    if (k === "type" || k === "title") return;
    var v = d[k];
    if (v === null || v === undefined || v === "") return;
    lineas.push(k.toUpperCase() + ":\n" + (typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)) + "\n");
  });
  MailApp.sendEmail({ to: ADMIN, subject: asunto, body: lineas.join("\n") || JSON.stringify(d, null, 2) });
  // Opcional: también guardar una fila en una hoja de cálculo
  // var sh = SpreadsheetApp.openById("ID_DE_LA_HOJA").getSheets()[0]; sh.appendRow([new Date(), tipo, d.title || "", JSON.stringify(d)]);
  return ContentService.createTextOutput("ok");
}

function doGet() {
  return ContentService.createTextOutput("Plan de comidas · endpoint activo");
}
