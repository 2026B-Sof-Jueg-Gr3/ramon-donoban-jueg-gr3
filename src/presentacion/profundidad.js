// Profundidad: el suelo al fondo, los objetos planos del suelo encima, todo lo que se levanta según dónde pisa
// (su base, en píxeles de y), y por encima de todo la oscuridad y la interfaz
// enLaPared: lo que cuelga del muro norte (por encima de sus baldosas)
export const PROFUNDIDAD = { suelo: 0, marcas: 1, enLaPared: 256.2, oscuridad: 100000, interfaz: 100001 };
