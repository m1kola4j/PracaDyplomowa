const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

// Publiczne endpointy
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Chronione endpointy (wymagają zalogowania)
router.post('/', authMiddleware, createProduct);
router.put('/:id', authMiddleware, updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;

