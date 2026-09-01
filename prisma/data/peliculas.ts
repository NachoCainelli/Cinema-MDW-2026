/**
 * Catálogo de películas de ejemplo para el seed.
 *
 * Por qué está en su propio archivo: `seed.ts` describe el *flujo* del sistema
 * (usuarios, salas, funciones, una compra); esta es la *data*. Separarlas deja
 * el seed legible y permite agregar títulos sin tocar la lógica.
 *
 * Origen de los datos: TMDB (https://www.themoviedb.org). Duración e `imagenUrl`
 * se tomaron de la ficha pública de cada película; las sinopsis están escritas
 * para este proyecto. La clasificación es la equivalencia local (INCAA) de la
 * calificación por edad de cada título, no un dato importado.
 *
 * `imagenUrl` apunta al CDN de TMDB. Es provisorio: cuando exista el flujo de
 * carga de imágenes, estas URLs se reemplazan por las del bucket de Supabase
 * Storage (ver `lib/schemas/pelicula.ts`). Mientras tanto, para renderizarlas
 * con `next/image` hay que habilitar `image.tmdb.org` en `remotePatterns` de
 * `next.config.ts`.
 *
 * Cubre las 9 categorías y las 4 clasificaciones del schema, para tener casos
 * de todos los valores del enum al filtrar la cartelera.
 */
import { Clasificacion, Categoria } from "@prisma/client";

export type PeliculaSeed = {
  titulo: string;
  sinopsis: string;
  duracionMinutos: number;
  clasificacion: Clasificacion;
  categoria: Categoria;
  imagenUrl: string;
};

const POSTER = "https://image.tmdb.org/t/p/w500";

export const peliculas: PeliculaSeed[] = [
  {
    titulo: "Mad Max: Furia en el camino",
    sinopsis:
      "En un desierto post-apocalíptico, Max se cruza con Furiosa, una guerrera que huye del tirano Immortan Joe llevando consigo a sus cinco esposas. Juntos emprenden una persecución sin tregua a través del páramo.",
    duracionMinutos: 121,
    clasificacion: Clasificacion.MAS_16,
    categoria: Categoria.ACCION,
    imagenUrl: `${POSTER}/ulcAi4dKpAjHwYGS08vNyx9H6I9.jpg`,
  },
  {
    titulo: "Batman: El caballero de la noche",
    sinopsis:
      "Batman, el comisario Gordon y el fiscal Harvey Dent le ganan terreno al crimen organizado de Ciudad Gótica, hasta que aparece el Guasón: un criminal sin plan ni ambición más que ver arder el orden que construyeron.",
    duracionMinutos: 152,
    clasificacion: Clasificacion.MAS_13,
    categoria: Categoria.ACCION,
    imagenUrl: `${POSTER}/qJ2tW6WMUDux911r6m7haRef0WH.jpg`,
  },
  {
    titulo: "El gran hotel Budapest",
    sinopsis:
      "Las aventuras de Gustave H., legendario conserje de un hotel europeo de entreguerras, y de Zero Moustafa, el botones que se convierte en su amigo más leal, entre un robo de arte, una herencia disputada y una guerra que se acerca.",
    duracionMinutos: 100,
    clasificacion: Clasificacion.MAS_16,
    categoria: Categoria.COMEDIA,
    imagenUrl: `${POSTER}/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg`,
  },
  {
    titulo: "Pequeña Miss Sunshine",
    sinopsis:
      "Una familia disfuncional se sube a una combi Volkswagen destartalada para cruzar el país y llevar a la hija menor a un concurso de belleza infantil. El viaje les sale mucho peor y mucho mejor de lo que esperaban.",
    duracionMinutos: 102,
    clasificacion: Clasificacion.MAS_13,
    categoria: Categoria.COMEDIA,
    imagenUrl: `${POSTER}/niNdhTpPHSgw22tK0PLjQMV640v.jpg`,
  },
  {
    titulo: "Parásitos",
    sinopsis:
      "La familia Kim, que sobrevive de changas en un semisótano, se infiltra uno a uno como empleados en la casa de los acomodados Park. El plan funciona hasta que descubren que no son los únicos con un secreto en esa casa.",
    duracionMinutos: 133,
    clasificacion: Clasificacion.MAS_16,
    categoria: Categoria.DRAMA,
    imagenUrl: `${POSTER}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`,
  },
  {
    titulo: "Whiplash: Música y obsesión",
    sinopsis:
      "Un joven baterista entra al conservatorio más exigente del país y queda bajo la tutela de un director que humilla y quiebra a sus alumnos en nombre de la excelencia. La pregunta es cuánto está dispuesto a resistir.",
    duracionMinutos: 107,
    clasificacion: Clasificacion.MAS_13,
    categoria: Categoria.DRAMA,
    imagenUrl: `${POSTER}/7fn624j5lj3xTme2SgiLCeuedmO.jpg`,
  },
  {
    titulo: "El legado del diablo",
    sinopsis:
      "Tras la muerte de la abuela, la familia Graham empieza a descubrir lo que la mujer había ocultado toda su vida. El duelo se convierte en algo mucho más oscuro, y el linaje familiar resulta imposible de esquivar.",
    duracionMinutos: 128,
    clasificacion: Clasificacion.MAS_18,
    categoria: Categoria.TERROR,
    imagenUrl: `${POSTER}/4GFPuL14eXi66V96xBWY73Y9PfR.jpg`,
  },
  {
    titulo: "El conjuro",
    sinopsis:
      "Los investigadores paranormales Ed y Lorraine Warren llegan a una granja aislada donde una familia con cinco hijas convive con una presencia que se vuelve cada noche más violenta.",
    duracionMinutos: 112,
    clasificacion: Clasificacion.MAS_16,
    categoria: Categoria.TERROR,
    imagenUrl: `${POSTER}/wVYREutTvI2tmxr6ujrHT704wGF.jpg`,
  },
  {
    titulo: "Interestelar",
    sinopsis:
      "Con la Tierra agotada, un expiloto de la NASA deja a sus hijos para atravesar un agujero de gusano y buscar un planeta habitable. Del otro lado, cada hora vale años de la vida que dejó atrás.",
    duracionMinutos: 169,
    clasificacion: Clasificacion.MAS_13,
    categoria: Categoria.CIENCIA_FICCION,
    imagenUrl: `${POSTER}/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg`,
  },
  {
    titulo: "La llegada",
    sinopsis:
      "Doce naves extraterrestres aterrizan en distintos puntos del planeta. Una lingüista es convocada para descifrar su idioma antes de que el miedo de los gobiernos derive en una guerra.",
    duracionMinutos: 116,
    clasificacion: Clasificacion.MAS_13,
    categoria: Categoria.CIENCIA_FICCION,
    imagenUrl: `${POSTER}/pEzNVQfdzYDzVK0XqxERIw2x2se.jpg`,
  },
  {
    titulo: "El viaje de Chihiro",
    sinopsis:
      "Una nena de diez años queda atrapada en un mundo de espíritus donde sus padres fueron convertidos en cerdos. Para rescatarlos tiene que trabajar en una casa de baños regenteada por una bruja y recordar su propio nombre.",
    duracionMinutos: 125,
    clasificacion: Clasificacion.ATP,
    categoria: Categoria.ANIMACION,
    imagenUrl: `${POSTER}/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg`,
  },
  {
    titulo: "Coco",
    sinopsis:
      "Miguel sueña con ser músico en una familia que tiene la música prohibida. La noche del Día de Muertos termina del otro lado, en la Tierra de los Muertos, buscando a un antepasado que le dé su bendición.",
    duracionMinutos: 105,
    clasificacion: Clasificacion.ATP,
    categoria: Categoria.ANIMACION,
    imagenUrl: `${POSTER}/6Ryitt95xrO8KXuqRGm1fUuNwqF.jpg`,
  },
  {
    titulo: "Free Solo",
    sinopsis:
      "El escalador Alex Honnold se prepara para subir los 900 metros de El Capitán sin cuerdas ni arnés. El documental sigue el entrenamiento, el vínculo con su pareja y el día en que finalmente lo intenta.",
    duracionMinutos: 100,
    clasificacion: Clasificacion.MAS_13,
    categoria: Categoria.DOCUMENTAL,
    imagenUrl: `${POSTER}/v4QfYZMACODlWul9doN9RxE99ag.jpg`,
  },
  {
    titulo: "La marcha de los pingüinos",
    sinopsis:
      "Cada año los pingüinos emperador cruzan a pie decenas de kilómetros de hielo antártico hasta el lugar donde nacieron, para aparearse y sacar adelante un único huevo en el invierno más duro del planeta.",
    duracionMinutos: 80,
    clasificacion: Clasificacion.ATP,
    categoria: Categoria.DOCUMENTAL,
    imagenUrl: `${POSTER}/o9xJ1xG1WKlHkl8ACqq0LShOuMu.jpg`,
  },
  {
    titulo: "La La Land: Una historia de amor",
    sinopsis:
      "Una actriz que encadena castings fallidos y un pianista de jazz que sueña con su propio club se enamoran en Los Ángeles. Sostener la relación y sostener la ambición empiezan a ser cosas distintas.",
    duracionMinutos: 129,
    clasificacion: Clasificacion.ATP,
    categoria: Categoria.ROMANCE,
    imagenUrl: `${POSTER}/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg`,
  },
  {
    titulo: "Amélie",
    sinopsis:
      "Una moza tímida de Montmartre decide dedicarse en secreto a arreglarles la vida a los demás. Entre plan y plan aparece un desconocido que colecciona fotos descartadas de fotomatones.",
    duracionMinutos: 122,
    clasificacion: Clasificacion.MAS_13,
    categoria: Categoria.ROMANCE,
    imagenUrl: `${POSTER}/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg`,
  },
  {
    titulo: "Pecados capitales",
    sinopsis:
      "Un detective a punto de jubilarse y su reemplazo recién llegado siguen el rastro de un asesino serial que elige a sus víctimas según los siete pecados capitales. Cada escena del crimen es una lección.",
    duracionMinutos: 127,
    clasificacion: Clasificacion.MAS_18,
    categoria: Categoria.SUSPENSO,
    imagenUrl: `${POSTER}/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg`,
  },
  {
    titulo: "El secreto de sus ojos",
    sinopsis:
      "Un empleado judicial jubilado escribe una novela sobre el caso que nunca pudo cerrar: el asesinato de una joven en el Buenos Aires de los setenta. Veinticinco años después, la investigación lo sigue esperando.",
    duracionMinutos: 130,
    clasificacion: Clasificacion.MAS_16,
    categoria: Categoria.SUSPENSO,
    imagenUrl: `${POSTER}/dkeAwfZzwL3WvToydE3CXiY80E0.jpg`,
  },
];
