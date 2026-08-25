# Diagrama de entidades — Cinema MDW 2026

```mermaid
erDiagram
    USUARIO ||--o{ COMPRA : realiza
    SALA ||--o{ BUTACA : contiene
    SALA ||--o{ FUNCION : programa
    PELICULA ||--o{ FUNCION : se_proyecta_en
    FUNCION ||--o{ ENTRADA : genera
    BUTACA ||--o{ ENTRADA : reservada_en
    COMPRA ||--o{ ENTRADA : agrupa

    USUARIO {
        string id PK
        string email UK
        string nombre
        string passwordHash
        string rol
    }
    SALA {
        string id PK
        string nombre UK
        int filas
        int columnas
        datetime eliminadaEn "null = activa"
    }
    BUTACA {
        string id PK
        string salaId FK
        int fila
        int columna
    }
    PELICULA {
        string id PK
        string titulo
        string sinopsis
        int duracionMin
        string clasificacion
        string categoria
        string imagenUrl "opcional"
        datetime bajaEn "null = en cartelera"
    }
    FUNCION {
        string id PK
        string peliculaId FK
        string salaId FK
        datetime fechaHora
    }
    COMPRA {
        string id PK
        string usuarioId FK
        string estado
        datetime fecha
    }
    ENTRADA {
        string id PK
        string funcionId FK
        string butacaId FK
        string compraId FK
    }
```

## Relaciones

- Un Usuario tiene muchas Compras asociadas.
- Una Sala tiene muchas Butacas asociadas.
- Una Sala tiene muchas Funciones asociadas.
- Una Película tiene muchas Funciones asociadas.
- Una Función tiene muchas Entradas asociadas.
- Una Butaca tiene muchas Entradas asociadas.
- Una Compra tiene muchas Entradas asociadas.