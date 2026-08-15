# ADR 0001 — Plantilla de decisión técnica

**Estado:** plantilla
**Fecha:** <YYYY-MM-DD>
**Decide:** <rol / integrante>

---

## Qué es un ADR y cuándo escribirlo

Un *Architecture Decision Record* documenta una decisión que **cuesta revertir**. No se escribe para cada cambio: se escribe cuando dentro de dos meses alguien va a preguntar "¿y por qué está hecho así?".

Escribí un ADR cuando decidas sobre:

- el modelo de datos (una relación N‑N, una desnormalización, un campo calculado);
- dónde vive una regla de negocio;
- cómo se resuelve la autorización;
- incorporar una dependencia externa;
- cualquier cosa que descartaron después de discutirla en equipo.

No escriban un ADR para elegir el nombre de una variable.

---

## Contexto

Qué problema apareció y qué restricciones había. Sin esto el ADR no sirve: dentro de dos meses el contexto se olvida y la decisión parece arbitraria.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| A | | |
| B | | |

## Decisión

Elegimos **<opción>**.

Porque <razón principal, en una oración>.

## Consecuencias

- Qué se vuelve más fácil.
- Qué se vuelve más difícil o más caro.
- Qué habría que revisar si cambia <alguna condición>.
