// Guarda en el navegador qué niveles ya se completaron
// Clave propia de la v2: el progreso guardado por la v1.1 (Sokoban) no debe desbloquear habitaciones
const CLAVE = 'inspector-logica-v2-completados';

export default class Progreso {
    static leerCompletados() {
        try { return JSON.parse(localStorage.getItem(CLAVE)) || []; }
        catch (e) { return []; }
    }

    static estaCompletado(numeroDeNivel) {
        return Progreso.leerCompletados().includes(numeroDeNivel);
    }

    static marcarCompletado(numeroDeNivel) {
        const completados = Progreso.leerCompletados();
        if (!completados.includes(numeroDeNivel)) completados.push(numeroDeNivel);
        try { localStorage.setItem(CLAVE, JSON.stringify(completados)); } catch (e) { }
    }
}
