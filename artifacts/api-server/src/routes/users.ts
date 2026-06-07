import { Router } from "express";
import { db, usersTable, walletsTable } from "@workspace/db";
import { eq, ilike, count, or } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";
import { ListUsersQueryParams, GetUserParams } from "@workspace/api-zod";

const router = Router();

router.get("/users", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const qp = ListUsersQueryParams.safeParse(req.query);
  const page = qp.success ? (qp.data.page ?? 1) : 1;
  const limit = qp.success ? (qp.data.limit ?? 20) : 20;
  const search = qp.success ? qp.data.search : undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(usersTable).leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id));
  let countQuery = db.select({ count: count() }).from(usersTable);

  if (search) {
    const condition = or(
      ilike(usersTable.username, `%${search}%`),
      ilike(usersTable.email, `%${search}%`)
    );
    query = query.where(condition) as typeof query;
    countQuery = countQuery.where(condition) as typeof countQuery;
  }

  const [totalResult] = await countQuery;
  const rows = await (query as any).limit(limit).offset(offset);

  const users = rows.map((row: any) => ({
    id: row.users.id,
    username: row.users.username,
    email: row.users.email,
    role: row.users.role,
    createdAt: row.users.createdAt,
    wallet: row.wallets
      ? { id: row.wallets.id, userId: row.wallets.userId, balance: parseFloat(row.wallets.balance) }
      : { id: 0, userId: row.users.id, balance: 0 },
  }));

  res.json({ users, total: totalResult.count, page, limit });
});

router.get("/users/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(eq(usersTable.id, params.data.id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const row = rows[0];
  res.json({
    id: row.users.id,
    username: row.users.username,
    email: row.users.email,
    role: row.users.role,
    createdAt: row.users.createdAt,
    wallet: row.wallets
      ? { id: row.wallets.id, userId: row.wallets.userId, balance: parseFloat(row.wallets.balance) }
      : { id: 0, userId: row.users.id, balance: 0 },
  });
});

export default router;
