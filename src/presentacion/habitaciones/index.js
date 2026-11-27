// Lo propio de cada habitación (su fenómeno, su ambiente, los efectos de su ayuda y cómo se calma al cierre) vive en un
// módulo por habitación con una interfaz común. La escena (src/escenas/Habitacion.js) hace todo lo demás: movimiento,
// linterna, alcance, narración, libreta, deducción, pausa e informe.
//
// Interfaz de una habitación (constructor(escena)):
//   crear()                       crea lo suyo; la escena ya tiene el mapa, el inspector, la linterna y las reglas
//   actualizar(dt, tiempo, { pausado })   cada cuadro (el fenómeno solo "pasa" cosas del juego si no hay pausa)
//   aplicarAyuda(efecto)          el efecto de la ayuda activa ('corriente', 'onda'…) o null; sin texto
//   alResponder(u, terminado)     la reacción visual a una acción con E sobre `u`; debe llamar a terminado() una vez
//   calmar()                      el cierre: el fenómeno se detiene
//   depurar()                     líneas para el panel F3
import Pasillo from './Pasillo.js';
import Cocina from './Cocina.js';
import Rastreo from './Rastreo.js';
import Juguetes from './Juguetes.js';
import Sombra from './Sombra.js';
import Despacho from './Despacho.js';

const HABITACIONES = { 1: Pasillo, 2: Cocina, 3: Rastreo, 4: Juguetes, 5: Sombra, 6: Despacho };

export function crearHabitacion(numeroDeNivel, escena) {
    const Clase = HABITACIONES[numeroDeNivel];
    if (!Clase) throw new Error(`la habitación ${numeroDeNivel} todavía no existe`);
    return new Clase(escena);
}
