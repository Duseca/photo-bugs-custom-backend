import Transactions from '../models/Transactions.js';

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
export const getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Transactions.countDocuments();

    const transactions = await Transactions.find().skip(skip).limit(limit);

    res.json({
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: transactions,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching transactions', error: error.message });
  }
};

// @desc    Get transaction by id
// @route   GET /api/transactions/:id
// @access  Private
export const getTransaction = async (req, res) => {
  try {
    const transaction = await Transactions.findById(req.params.id);
    res.json(transaction);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching transaction', error: error.message });
  }
};

// @desc    Get user transactions as seller
// @route   GET /api/transactions/seller/:id
// @access  Private
export const getUserTransactionsSold = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Transactions.countDocuments({ seller: req.params.id });

    const transactions = await Transactions.find({ seller: req.params.id })
      .skip(skip)
      .limit(limit);

    res.json({
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: transactions,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching transaction', error: error.message });
  }
};

// @desc    Get user transactions as buyer
// @route   GET /api/transactions/buyer/:id
// @access  Private
export const getUserTransactionsBought = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Transactions.countDocuments({ buyer: req.params.id });

    const transactions = await Transactions.find({ buyer: req.params.id })
      .skip(skip)
      .limit(limit);

    res.json({
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: transactions,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching transaction', error: error.message });
  }
};
