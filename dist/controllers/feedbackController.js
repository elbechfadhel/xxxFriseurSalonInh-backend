"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFeedback = exports.validateFeedback = exports.getFeedbacks = exports.listFeedback = exports.createFeedback = void 0;
const client_1 = require("../prisma/client");
const createFeedback = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ error: "All fields are required." });
        }
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailOk) {
            return res.status(400).json({ error: "Invalid email." });
        }
        const fb = await client_1.prisma.feedback.create({
            data: { name, email, message }, // approved defaults to false
        });
        res.status(201).json(fb);
    }
    catch (e) {
        console.error("createFeedback error:", e);
        res.status(500).json({ error: "Something went wrong." });
    }
};
exports.createFeedback = createFeedback;
const listFeedback = async (req, res) => {
    try {
        const validParam = req.query.valid?.toLowerCase();
        const filter = validParam === "all" ? "all" : validParam !== "false"; // default: approved only
        const where = filter === "all" ? {} : { approved: filter };
        const result = await client_1.prisma.feedback.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        res.json(result);
    }
    catch (e) {
        console.error("listFeedback error:", e);
        res.status(500).json({ error: "Failed to fetch feedbacks." });
    }
};
exports.listFeedback = listFeedback;
exports.getFeedbacks = exports.listFeedback;
const validateFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const override = req.body?.approved;
        const updated = await client_1.prisma.feedback.update({
            where: { id },
            data: { approved: typeof override === "boolean" ? override : true },
        });
        res.json(updated);
    }
    catch (e) {
        if (e.code === "P2025") {
            return res.status(404).json({ error: "Feedback not found" });
        }
        console.error("validateFeedback error:", e);
        res.status(500).json({ error: "Failed to validate feedback." });
    }
};
exports.validateFeedback = validateFeedback;
const deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        await client_1.prisma.feedback.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (e) {
        if (e.code === "P2025") {
            return res.status(404).json({ error: "Feedback not found" });
        }
        console.error("deleteFeedback error:", e);
        res.status(500).json({ error: "Failed to delete feedback." });
    }
};
exports.deleteFeedback = deleteFeedback;
