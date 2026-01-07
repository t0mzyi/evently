import multer from "multer";
import path from "path";

const createStorage = (folderName) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, `public/uploads/${folderName}`);
    },
    filename: (req, file, cb) => {
      const identifier = req.session?.user || folderName;
      cb(null, `${identifier}-${Date.now()}${path.extname(file.originalname)}`);
    },
  });

export const upload = multer({
  storage: createStorage("avatars"),
  limits: { fileSize: 1024 * 1024 * 2 },
});

export const uploadVenue = multer({
  storage: createStorage("venues"),
  limits: { fileSize: 1024 * 1024 * 5 },
});
