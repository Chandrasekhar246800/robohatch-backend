const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth.middleware');
const { uploadToS3, deleteFromS3, extractS3Key } = require('../config/s3');

/**
 * STL File Upload Routes
 * All routes require JWT authentication
 * Users can only access their own designs
 */

// Apply authentication to ALL design routes
router.use(authenticateToken);

/**
 * File Upload Configuration with Multer
 * Using memory storage (buffer) for direct S3 upload
 */
const storage = multer.memoryStorage();

// File filter for validation
const fileFilter = (req, file, cb) => {
  // 1. Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.stl') {
    return cb(new Error('Only .stl files are allowed'), false);
  }

  // 2. Check MIME type
  // Note: STL files may have different MIME types
  const allowedMimeTypes = [
    'application/sla',
    'application/vnd.ms-pki.stl',
    'application/x-navistyle',
    'model/stl',
    'application/octet-stream' // Generic binary
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid STL file type'), false);
  }

  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

/**
 * POST /api/designs/upload
 * Upload STL file
 */
router.post('/upload', upload.single('stl_file'), async (req, res) => {
  try {
    // 1. Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please provide an STL file.'
      });
    }

    const userId = req.user.userId; // From JWT
    const file = req.file;

    // 2. Validate file is not empty
    if (file.size === 0) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty'
      });
    }

    // 3. Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;

    // 4. Construct S3 key (folder structure)
    const s3Key = `stl-designs/${userId}/${uniqueFilename}`;

    // 5. Upload to S3
    const fileUrl = await uploadToS3(
      file.buffer,
      s3Key,
      file.mimetype
    );

    // 6. Save metadata to database
    const result = await db.query(
      `INSERT INTO custom_designs 
       (user_id, file_url, file_name, file_size, file_type, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, fileUrl, file.originalname, file.size, 'stl']
    );

    const designId = result.insertId;

    // 7. Fetch created design
    const designs = await db.query(
      `SELECT id, user_id, product_id, file_url, file_name, file_size, file_type, created_at
       FROM custom_designs
       WHERE id = ?`,
      [designId]
    );

    // 8. Return success response
    res.status(201).json({
      success: true,
      message: 'STL file uploaded successfully',
      data: {
        design: {
          id: designs[0].id,
          user_id: designs[0].user_id,
          product_id: designs[0].product_id,
          file_url: designs[0].file_url,
          file_name: designs[0].file_name,
          file_size: designs[0].file_size,
          file_size_mb: (designs[0].file_size / (1024 * 1024)).toFixed(2),
          file_type: designs[0].file_type,
          created_at: designs[0].created_at
        }
      }
    });

  } catch (error) {
    console.error('Upload STL error:', error.message);

    // Handle specific multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 50MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${error.message}`
      });
    }

    // Handle file validation errors
    if (error.message.includes('Only .stl files') || error.message.includes('Invalid STL')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Handle S3 errors (don't expose details)
    if (error.message.includes('S3')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file. Please try again.'
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: 'Failed to upload STL file'
    });
  }
});

/**
 * GET /api/designs
 * Get all designs for logged-in user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT

    // Fetch all designs for user
    const designs = await db.query(
      `SELECT 
        id, 
        user_id, 
        product_id, 
        file_url, 
        file_name, 
        file_size, 
        file_type, 
        created_at
       FROM custom_designs
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    // Calculate total storage used
    const totalSize = designs.reduce((sum, design) => sum + (design.file_size || 0), 0);

    res.status(200).json({
      success: true,
      message: 'Designs retrieved successfully',
      data: {
        designs: designs.map(design => ({
          id: design.id,
          user_id: design.user_id,
          product_id: design.product_id,
          file_url: design.file_url,
          file_name: design.file_name,
          file_size: design.file_size,
          file_size_mb: design.file_size ? (design.file_size / (1024 * 1024)).toFixed(2) : '0.00',
          file_type: design.file_type,
          created_at: design.created_at
        })),
        summary: {
          total_designs: designs.length,
          total_size_bytes: totalSize,
          total_size_mb: (totalSize / (1024 * 1024)).toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('Get designs error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve designs'
    });
  }
});

/**
 * GET /api/designs/:id
 * Get single design by ID (only if user owns it)
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT
    const designId = req.params.id;

    // Validate ID
    if (!designId || isNaN(designId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid design ID'
      });
    }

    // Fetch design with ownership check
    const designs = await db.query(
      `SELECT 
        id, 
        user_id, 
        product_id, 
        file_url, 
        file_name, 
        file_size, 
        file_type, 
        created_at
       FROM custom_designs
       WHERE id = ? AND user_id = ?`,
      [designId, userId]
    );

    if (designs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Design not found or unauthorized'
      });
    }

    const design = designs[0];

    res.status(200).json({
      success: true,
      message: 'Design retrieved successfully',
      data: {
        design: {
          id: design.id,
          user_id: design.user_id,
          product_id: design.product_id,
          file_url: design.file_url,
          file_name: design.file_name,
          file_size: design.file_size,
          file_size_mb: design.file_size ? (design.file_size / (1024 * 1024)).toFixed(2) : '0.00',
          file_type: design.file_type,
          created_at: design.created_at
        }
      }
    });

  } catch (error) {
    console.error('Get design error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve design'
    });
  }
});

/**
 * DELETE /api/designs/:id
 * Delete STL design (file + DB record)
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT
    const designId = req.params.id;

    // Validate ID
    if (!designId || isNaN(designId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid design ID'
      });
    }

    // 1. Verify design exists AND belongs to user
    const designs = await db.query(
      `SELECT id, file_url, file_name 
       FROM custom_designs 
       WHERE id = ? AND user_id = ?`,
      [designId, userId]
    );

    if (designs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Design not found or unauthorized'
      });
    }

    const design = designs[0];

    // 2. Extract S3 key from file URL
    const s3Key = extractS3Key(design.file_url);

    // 3. Delete from S3
    try {
      await deleteFromS3(s3Key);
    } catch (s3Error) {
      // Log error but continue with DB deletion
      console.error('S3 delete failed, continuing with DB cleanup:', s3Error.message);
    }

    // 4. Delete from database
    await db.query(
      'DELETE FROM custom_designs WHERE id = ?',
      [designId]
    );

    // 5. Return success response
    res.status(200).json({
      success: true,
      message: 'Design deleted successfully',
      data: {
        deleted_design: {
          id: parseInt(designId),
          file_name: design.file_name
        }
      }
    });

  } catch (error) {
    console.error('Delete design error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete design'
    });
  }
});

module.exports = router;
