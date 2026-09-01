-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'GESTOR_CARTELERA', 'USUARIO');

-- CreateEnum
CREATE TYPE "Clasificacion" AS ENUM ('ATP', 'MAS_13', 'MAS_16', 'MAS_18');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('ACCION', 'COMEDIA', 'DRAMA', 'TERROR', 'CIENCIA_FICCION', 'ANIMACION', 'DOCUMENTAL', 'ROMANCE', 'SUSPENSO');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('PAGADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sala" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "filas" INTEGER NOT NULL,
    "columnas" INTEGER NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminadaEn" TIMESTAMP(3),

    CONSTRAINT "Sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Butaca" (
    "id" TEXT NOT NULL,
    "fila" INTEGER NOT NULL,
    "columna" INTEGER NOT NULL,
    "salaId" TEXT NOT NULL,

    CONSTRAINT "Butaca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pelicula" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "sinopsis" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "clasificacion" "Clasificacion" NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagenUrl" TEXT,
    "bajaEn" TIMESTAMP(3),

    CONSTRAINT "Pelicula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcion" (
    "id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "peliculaId" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,

    CONSTRAINT "Funcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'PAGADA',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrada" (
    "id" TEXT NOT NULL,
    "funcionId" TEXT NOT NULL,
    "butacaId" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,

    CONSTRAINT "Entrada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sala_nombre_key" ON "Sala"("nombre");

-- CreateIndex
CREATE INDEX "Butaca_salaId_idx" ON "Butaca"("salaId");

-- CreateIndex
CREATE UNIQUE INDEX "Butaca_salaId_fila_columna_key" ON "Butaca"("salaId", "fila", "columna");

-- CreateIndex
CREATE INDEX "Funcion_peliculaId_idx" ON "Funcion"("peliculaId");

-- CreateIndex
CREATE INDEX "Funcion_salaId_idx" ON "Funcion"("salaId");

-- CreateIndex
CREATE INDEX "Compra_usuarioId_idx" ON "Compra"("usuarioId");

-- CreateIndex
CREATE INDEX "Entrada_funcionId_idx" ON "Entrada"("funcionId");

-- CreateIndex
CREATE INDEX "Entrada_butacaId_idx" ON "Entrada"("butacaId");

-- CreateIndex
CREATE INDEX "Entrada_compraId_idx" ON "Entrada"("compraId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrada_funcionId_butacaId_key" ON "Entrada"("funcionId", "butacaId");

-- AddForeignKey
ALTER TABLE "Butaca" ADD CONSTRAINT "Butaca_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcion" ADD CONSTRAINT "Funcion_peliculaId_fkey" FOREIGN KEY ("peliculaId") REFERENCES "Pelicula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcion" ADD CONSTRAINT "Funcion_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrada" ADD CONSTRAINT "Entrada_funcionId_fkey" FOREIGN KEY ("funcionId") REFERENCES "Funcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrada" ADD CONSTRAINT "Entrada_butacaId_fkey" FOREIGN KEY ("butacaId") REFERENCES "Butaca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrada" ADD CONSTRAINT "Entrada_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
