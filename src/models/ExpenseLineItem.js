const mongoose = require("mongoose");

const expenseLineItemSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReimbursementReport",
      required: true,
    },
    expenseDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },
    receiptUrl: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

expenseLineItemSchema.index({ report: 1, expenseDate: 1 });

module.exports = mongoose.model("ExpenseLineItem", expenseLineItemSchema);
