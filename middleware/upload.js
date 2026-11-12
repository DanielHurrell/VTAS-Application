
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Store uploads outside the public folder
const uploadDirectory = path.join(__dirname, '..', 'uploads', 'application-documents');

// Create the directory if it doesn't already exist
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Configure where and how files are stored
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDirectory);
    },

    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const uniqueName = crypto.randomUUID() + extension;

        callback(null, uniqueName);
    }
});

// Allowed file types
const allowedTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
};

// Validate uploaded files
function fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMimeType = allowedTypes[extension];

    if (!expectedMimeType || file.mimetype !== expectedMimeType) {
        return callback(
            new Error('Only PDF, JPG, JPEG and PNG files are allowed.')
        );
    }

    callback(null, true);
}

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB per file
        files: 5
    }
});

module.exports = upload;