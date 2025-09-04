
import { Request, Response } from "express";

type Feedback = {
    id: string;
    name: string;
    email: string;
    message: string;
    valid: boolean;
    createdAt: string;
};

let feedbacks: Feedback[] = [];


export const createFeedback = (req: Request, res: Response) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required." });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return res.status(400).json({ error: "Invalid email." });

    const fb: Feedback = {
        id: Date.now().toString(),
        name: String(name),
        email: String(email),
        message: String(message),
        valid: false,                    // pending by default
        createdAt: new Date().toISOString(),
    };

    feedbacks.push(fb);
    res.status(201).json(fb);
};


export const listFeedback = (req: Request, res: Response) => {
    const validParam = (req.query.valid as string | undefined)?.toLowerCase();

    const filter: boolean | "all" =
        validParam === "all"   ? "all"  :
            validParam !== "false"; // default approved only

    const result = (filter === "all" ? feedbacks : feedbacks.filter(f => f.valid === filter))
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    res.json(result);
};


export const getFeedbacks = listFeedback;


export const validateFeedback = (req: Request, res: Response) => {
    const { id } = req.params;
    const overrideValid = req.body?.valid;

    const fb = feedbacks.find(f => f.id === id);
    if (!fb) return res.status(404).json({ error: "Feedback not found" });

    fb.valid = typeof overrideValid === "boolean" ? overrideValid : true;
    res.json(fb);
};
export const deleteFeedback = (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = feedbacks.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ error: "Feedback not found" });

    const [removed] = feedbacks.splice(idx, 1);
    return res.status(200).json(removed); // or res.status(204).send() if you prefer no body
};
