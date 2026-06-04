import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { providers, secrets } from "../db/schema";

export const providerRoutes = new Hono<{ Bindings: Env }>();

// 列表
providerRoutes.get("/", async (c) => {
    const db = drizzle(c.env.DB);
    const list = await db.select().from(providers);
    return c.json(list);
});

// 新增
providerRoutes.post("/", async (c) => {
    const db = drizzle(c.env.DB);
    const body = await c.req.json<{ name: string; avatar?: string }>();
    const result = await db.insert(providers).values({
        name: body.name,
        avatar: body.avatar ?? null,
    }).returning();
    return c.json(result[0], 201);
});

// 修改
providerRoutes.put("/:id", async (c) => {
    const db = drizzle(c.env.DB);
    const id = Number(c.req.param("id"));
    const body = await c.req.json<{ name?: string; avatar?: string }>();
    const result = await db.update(providers).set(body).where(eq(providers.id, id)).returning();
    if (!result[0]) return c.json({ error: "Not found." }, 404);
    return c.json(result[0]);
});

// 删除
providerRoutes.delete("/:id", async (c) => {
    const db = drizzle(c.env.DB);
    const id = Number(c.req.param("id"));
    // 先删关联的 secrets
    await db.delete(secrets).where(eq(secrets.providerId, id));
    const result = await db.delete(providers).where(eq(providers.id, id)).returning();
    if (!result[0]) return c.json({ error: "Not found." }, 404);
    return c.json({ ok: true });
});
