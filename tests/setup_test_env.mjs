import { createRequire } from "module";

// Intercepts the "server-only" marker package during Node.js unit test runs
// (In production Next.js builds, Next.js handles server-only natively via react-server export)
const req = createRequire(import.meta.url);
try {
  const resolved = req.resolve("server-only");
  req.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
  };
} catch {
  // safe ignore
}
