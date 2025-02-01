import fs from 'fs';
import multer from 'multer';
import path from 'path';

const download =  (url: string): string | null => {
  const imagePath = path.join(__dirname, '../../uploads', path.basename(url));
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const imageData = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    return imageData;
  } catch (err) {
    console.error(`Error reading image: ${err}`);
    return null;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Only allow image file types
const fileFilter = (req:any, file:any, cb:any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image!'), false);
  }
};

const upload = multer({ storage, fileFilter });

export {upload, download};
