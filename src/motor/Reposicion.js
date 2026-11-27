// El nivel 6 no puede quedar sin salida: la deducción final usa pistas de habitaciones anteriores (el recibo, la carta, los planos) y, si
// el Registro perdió una, nunca se ofrecería. Esas pistas son imprescindibles para terminar su habitación, así que si la habitación está
// completada el jugador YA LA TUVO: se repone en el Registro al entrar al nivel 6. Sin Phaser y sin tocar lo guardado: solo dice cuáles.
//
//   pruebas:      reglas.deduccion.pruebas del nivel (las que tienen "registro": true vienen de otra habitación)
//   narrativas:   { n: narrativa } — de ahí sale de qué habitación es cada pista
//   completados:  [n] — las habitaciones completadas (Progreso)
//   registradas:  { idDePista: {...} } — lo que el Registro ya tiene (lo que ya está no se vuelve a anotar)
export function pistasQueReponer({ pruebas = {}, narrativas = {}, completados = [], registradas = {} }) {
    const reponer = [];
    for (const [id, prueba] of Object.entries(pruebas)) {
        if (!prueba.registro || Object.hasOwn(registradas, id)) continue;
        const nivel = Object.keys(narrativas).map(Number).find(n => narrativas[n]?.pistas?.some(p => p.id === id));
        if (nivel !== undefined && completados.includes(nivel)) reponer.push({ id, nivel });
    }
    return reponer;
}
