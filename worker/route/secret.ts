import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { secrets } from "../db/schema";

export const secretRoutes = new Hono<{ Bindings: Env }>();

// 列表
secretRoutes.get("/", async (c) => {
    const db = drizzle(c.env.DB);
    const list = await db.select().from(secrets);
    return c.json(list);
});

// 新增
secretRoutes.post("/", async (c) => {
    const db = drizzle(c.env.DB);
    const body = await c.req.json<{ providerId: number; name: string; value: string; remark?: string }>();
    const result = await db.insert(secrets).values({
        providerId: body.providerId,
        name: body.name,
        value: body.value,
        remark: body.remark ?? null,
    }).returning();
    return c.json(result[0], 201);
});

// 修改
secretRoutes.put("/:id", async (c) => {
    const db = drizzle(c.env.DB);
    const id = Number(c.req.param("id"));
    const body = await c.req.json<{ providerId?: number; name?: string; value?: string; remark?: string }>();
    const result = await db.update(secrets).set(body).where(eq(secrets.id, id)).returning();
    if (!result[0]) return c.json({ error: "Not found." }, 404);
    return c.json(result[0]);
});

// 删除
secretRoutes.delete("/:id", async (c) => {
    const db = drizzle(c.env.DB);
    const id = Number(c.req.param("id"));
    const result = await db.delete(secrets).where(eq(secrets.id, id)).returning();
    if (!result[0]) return c.json({ error: "Not found." }, 404);
    return c.json({ ok: true });
});

