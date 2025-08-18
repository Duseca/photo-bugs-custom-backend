import Transactions from '../models/Transactions.js';

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transactions.find();
    res.json(transactions);
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
    const transactions = await Transactions.find({ seller: req.params.id });
    res.json(transactions);
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
    const transactions = await Transactions.find({ buyer: req.params.id });
    res.json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching transaction', error: error.message });
  }
};
