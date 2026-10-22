/**
 * Un enlace del acceso dentro de una frase, en el color de la marca: su zona para el dedo crece hasta 44 px
 * de alto sin mover el texto, y con el teclado lleva el anillo de foco.
 */
export const AUTH_LINK =
  "relative rounded-sm font-semibold text-primary underline-offset-4 outline-none before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * El error de todo el formulario (p. ej. «Email o contraseña incorrectos»), arriba de los campos: en el rojo
 * de la marca, con su icono para no depender sólo del color. Los de cada campo van debajo de él (FormField).
 * El fondo, al 7 %: al 10 %, el rojo del oscuro se quedaba en 4,44:1; así da 4,9 en el claro y 4,6 en el oscuro.
 */
export const FORM_ALERT =
  "flex items-start gap-2.5 rounded-lg bg-destructive/7 px-3.5 py-3 text-sm font-medium text-destructive [&_svg]:mt-px [&_svg]:size-4 [&_svg]:shrink-0";
