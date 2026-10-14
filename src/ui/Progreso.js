// Guarda en el navegador qué niveles ya se completaron
const CLAVE = 'sokoban-completados';

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
