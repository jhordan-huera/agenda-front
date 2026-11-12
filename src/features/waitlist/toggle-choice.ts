/** Marca o desmarca un valor de una lista (los días y las partes del día de la lista de espera, spec 047). */
export const toggleChoice = <T>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
