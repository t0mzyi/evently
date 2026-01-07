import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination : (req,file,cb) => {
        cb(null,'public/uploads/avatars')
    },
    filename : (req,file,cb) => {
        cb(null,req.session.user + '-' + Date.now() + path.extname(file.originalname))
    }
})

export const upload = multer({
    storage : storage,
    limits : { fileSize: 1024 * 1024 * 2 }
})