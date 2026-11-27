// La etiqueta que lee el revisor de la interfaz (src/presentacion/Revisor.js, tecla F6):
//   tipo     'contenido' (un texto o una imagen) · 'control' (el fondo de un botón, una fila o una tarjeta) · 'ignorar' (un
//            marco, un velo o un fondo que se superpone a propósito)
//   grupo    lo que pertenece a un mismo control (su fondo y sus textos) comparte grupo
//   dentroDe el recuadro { x, y, ancho, alto } del que no puede salirse
//   rect     { x, y, ancho, alto } local: lo que mide un objeto que no sabe medirse (un Graphics)
export function etiquetar(objeto, datos) {
    objeto.setData('rev', datos);
    return objeto;
}
