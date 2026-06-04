import { Hono } from "hono";
import { getSignedCookie } from "hono/cookie";
import { authRoutes } from "./route/auth";
import { providerRoutes } from "./route/provider";
import { secretRoutes } from "./route/secret";

const app = new Hono<{ Bindings: Env }>();

app.route("/api/auth", authRoutes);

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/auth" || c.req.path === "/api/auth/") return next();
  if ((await getSignedCookie(c, c.env.SECRET, "auth")) === "1") return next();
  return c.json({ error: "Unauthorized." }, 401);
});

app.route("/api/providers", providerRoutes);
app.route("/api/secrets", secretRoutes);


export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
