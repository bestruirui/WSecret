import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { Hono } from "hono";

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.get("/", async (c) => {
    if ((await getSignedCookie(c, c.env.SECRET, "auth")) !== "1") {
        return c.json({ error: "Unauthorized." }, 401);
    }
    return c.json({ ok: true });
});

authRoutes.post("/", async (c) => {
    const body = await c.req.json<{ secret: string }>();
    if (body.secret !== c.env.SECRET) {
        return c.json({ error: "Invalid SECRET." }, 401);
    }

    await setSignedCookie(c, "auth", "1", c.env.SECRET, {
        httpOnly: true,
        path: "/api",
        sameSite: "Lax",
        secure: new URL(c.req.url).protocol === "https:",
        maxAge: 60 * 60 * 24 * 400,
    });

    return c.json({ ok: true });
});
