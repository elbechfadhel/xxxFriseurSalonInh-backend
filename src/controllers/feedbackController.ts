// src/controllers/feedbackController.ts
import { Request, Response } from "express";
import { prisma } from "../prisma/client";

export const createFeedback = async (req: Request, res: Response) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailOk) {
            return res.status(400).json({ error: "Invalid email." });
        }

        const fb = await prisma.feedback.create({
            data: { name, email, message }, // approved defaults to false
        });

        res.status(201).json(fb);
    } catch (e) {
        console.error("createFeedback error:", e);
        res.status(500).json({ error: "Something went wrong." });
    }
};

export const listFeedback = async (req: Request, res: Response) => {
    try {
        const validParam = (req.query.valid as string | undefined)?.toLowerCase();

        const filter: boolean | "all" =
            validParam === "all" ? "all" : validParam !== "false"; // default: approved only

        const where = filter === "all" ? {} : { approved: filter as boolean };

        const result = await prisma.feedback.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        res.json(result);
    } catch (e) {
        console.error("listFeedback error:", e);
        res.status(500).json({ error: "Failed to fetch feedbacks." });
    }
};

export const getFeedbacks = listFeedback;

export const validateFeedback = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const override = req.body?.approved;

        const updated = await prisma.feedback.update({
            where: { id },
            data: { approved: typeof override === "boolean" ? override : true },
        });

        res.json(updated);
    } catch (e: any) {
        if (e.code === "P2025") {
            return res.status(404).json({ error: "Feedback not found" });
        }
        console.error("validateFeedback error:", e);
        res.status(500).json({ error: "Failed to validate feedback." });
    }
};

export const deleteFeedback = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.feedback.delete({ where: { id } });
        return res.status(204).send();
    } catch (e: any) {
        if (e.code === "P2025") {
            return res.status(404).json({ error: "Feedback not found" });
        }
        console.error("deleteFeedback error:", e);
        res.status(500).json({ error: "Failed to delete feedback." });
    }
};
