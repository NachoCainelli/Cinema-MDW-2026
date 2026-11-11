## Qué hace este PR

<Una o dos oraciones. Si hay una historia de usuario asociada, linkeala.>

## Checklist

- [ ] Funciona en el preview deployment, no solo en local
- [ ] La validación está en el servidor
- [ ] La autorización se verifica en el servidor (no alcanza con esconder el botón)
- [ ] Estados de carga y error resueltos en la UI
- [ ] `pnpm build` y `pnpm typecheck` pasan
- [ ] Las pruebas de dominio y e2e pasan (`pnpm test` y `pnpm test:e2e`)
- [ ] Si agregué una prueba, la vi fallar (y cuento abajo qué rompí y qué prueba se puso roja)
- [ ] Si agregué o cambié un endpoint del contrato, tiene su fila en `e2e/permisos.spec.ts`
- [ ] Si se tocó el modelo de datos, hay migración y (si la decisión fue discutida) un ADR
