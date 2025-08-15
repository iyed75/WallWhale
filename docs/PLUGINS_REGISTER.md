# Plugin registration (src/plugins/register.ts)

This small file acts as a central place to register global plugin hooks or perform early plugin wiring. Currently it contains a placeholder `registerPlugins` function that can be extended to register additional hooks or perform global setup logic.

## Purpose

- Provide a single location to add cross-cutting plugin registration logic in one place.
- Keep `index.ts` or the application bootstrap file concise by moving plugin wiring here.

## Current behavior

- `registerPlugins(app: FastifyInstance)` is exported but empty; the application loads plugin modules individually elsewhere.

## Recommendations

- Use this file to register any global lifecycle hooks that should be applied regardless of the environment (for example, telemetry initialization, global error handlers, or feature toggles).
- Avoid adding heavy logic here; prefer dedicated plugin modules (see `src/plugins/` for examples).

---

Next: I can document `src/plugins/audit.ts` or route registration if you want; both are small and low-risk.
