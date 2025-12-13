// src/controllers/galleryController.ts
import type { Request, Response } from "express";
import { prisma } from "../prisma/prisma";

const projectUrl = process.env.SUPABASE_PROJECT_URL!;
const bucketName = process.env.SUPABASE_BUCKET_NAME || "gallery";

const getPublicUrl = (filePath: string) =>
    `${projectUrl}/storage/v1/object/public/${bucketName}/${filePath}`;

// GET /api/gallery
export const getGalleryImages = async (_req: Request, res: Response) => {
    try {
        const images = await prisma.galleryImage.findMany({
            orderBy: { createdAt: "desc" },
        });

        const result = images.map((img) => ({
            id: img.id,
            title: img.title,
            filePath: img.path,
            url: getPublicUrl(img.path),
            createdAt: img.createdAt,
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load gallery images" });
    }
};

// POST /api/gallery
// body: { title: string; filePath: string; }
export const createGalleryImage = async (req: Request, res: Response) => {
    try {
        const { title, filePath } = req.body as {
            title: string;
            filePath: string;
        };

        if (!title || !filePath) {
            return res
                .status(400)
                .json({ message: "title and filePath are required" });
        }

        const image = await prisma.galleryImage.create({
            data: { title,path: filePath },
        });

        res.status(201).json({
            ...image,
            url: getPublicUrl(image.path),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create gallery image" });
    }
};

// DELETE /api/gallery/:id
export const deleteGalleryImage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.reservation.delete({ where: { id } });

        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete gallery image" });
    }
};
