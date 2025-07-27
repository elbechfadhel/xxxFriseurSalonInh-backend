import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define upload directory
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

// Export the multer instance
export const upload = multer({ storage });
