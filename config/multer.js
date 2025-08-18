import multer from 'multer';

export const memoryUpload = multer({
  storage: multer.memoryStorage(),
}).single('image');

export default upload;
