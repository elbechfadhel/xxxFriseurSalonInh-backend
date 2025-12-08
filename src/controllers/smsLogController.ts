// src/controllers/smsLogController.ts
import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";

type SmsStatus = "ok" | "error" | "exception";

export const listSmsLogs = async (req: Request, res: Response) => {
    try {
        // --- Pagination ---
        const pageParam = Number(req.query.page ?? 1);
        const pageSizeParam = Number(req.query.pageSize ?? 50);

        const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
        const pageSize =
            Number.isFinite(pageSizeParam) && pageSizeParam > 0 && pageSizeParam <= 200
                ? pageSizeParam
                : 50; // sane default + upper bound

        const skip = (page - 1) * pageSize;
        const take = pageSize;

        // --- Filters ---
        const phoneFilter = (req.query.phone ?? req.query.to ?? "").toString().trim();
        const statusFilterRaw = (req.query.status ?? "").toString().trim() as SmsStatus | "";
        const statusFilter: SmsStatus | undefined =
            statusFilterRaw === "ok" ||
            statusFilterRaw === "error" ||
            statusFilterRaw === "exception"
                ? statusFilterRaw
                : undefined;

        const dateFromRaw = (req.query.from ?? "").toString().trim();
        const dateToRaw = (req.query.toDate ?? "").toString().trim();

        const where: Prisma.SmsLogWhereInput = {};



        if (statusFilter) {
            where.status = statusFilter;
        }

        if (dateFromRaw || dateToRaw) {
            const createdAt: { gte?: Date; lte?: Date } = {};

            if (dateFromRaw) {
                const d = new Date(dateFromRaw);
                if (!isNaN(d.getTime())) {
                    createdAt.gte = d;
                }
            }

            if (dateToRaw) {
                const d = new Date(dateToRaw);
                if (!isNaN(d.getTime())) {
                    // include whole day if only date given
                    if (!dateToRaw.includes("T")) {
                        d.setHours(23, 59, 59, 999);
                    }
                    createdAt.lte = d;
                }
            }

            if (createdAt.gte || createdAt.lte) {
                where.createdAt = createdAt;
            }
        }

        // --- DB queries (with count for pagination) ---
        const [items, total] = await Promise.all([
            prisma.smsLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            prisma.smsLog.count({ where }),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        return res.json({
            items,
            total,
            page,
            pageSize,
            totalPages,
        });
    } catch (err) {
        console.error("Failed to list SMS logs:", err);
        return res.status(500).json({ error: "Failed to load SMS logs" });
    }
};
