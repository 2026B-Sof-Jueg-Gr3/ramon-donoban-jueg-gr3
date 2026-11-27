// Expediente del jugador guardado en el navegador: qué pistas descubrió, en qué nivel y cuándo.
// Reiniciar un nivel no lo borra; es la base del cuaderno de investigación.
// Clave propia de la v2: las pistas guardadas por la v1.1 no deben aparecer como encontradas en la v2
const CLAVE = 'inspector-logica-v2-expediente';

export default class Registro {
    static leer() {
        try { return JSON.parse(localStorage.getItem(CLAVE)) || { pistas: {} }; }
        catch (e) { return { pistas: {} }; }
    }

    static guardar(expediente) {
        try { localStorage.setItem(CLAVE, JSON.stringify(expediente)); } catch (e) { }
    }

    // Devuelve true si la pista no estaba registrada
    static registrarPista(id, nivel) {
        const expediente = Registro.leer();
        if (expediente.pistas[id]) return false;
        expediente.pistas[id] = { nivel, descubierta: new Date().toISOString() };
        Registro.guardar(expediente);
        return true;
    }

    static pistasDelNivel(nivel) {
        return Object.entries(Registro.leer().pistas).filter(([, p]) => p.nivel === nivel).map(([id]) => id);
    }
}
