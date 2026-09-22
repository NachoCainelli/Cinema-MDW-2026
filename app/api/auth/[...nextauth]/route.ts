/**
 * Endpoints de Auth.js: login, callback de Google, logout, sesión, CSRF.
 * Toda la configuración vive en `lib/auth.ts`; este archivo solo la expone.
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
