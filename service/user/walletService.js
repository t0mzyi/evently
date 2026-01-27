import razorpay from "../../config/razorpay.js";
import transactionDb from "../../model/transactionsDb.js";
import userDb from "../../model/userDb.js";
import crypto from "crypto";
import walletDb from "../../model/walletDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";

export const walletDetails = async (userId) => {
  const user = await userDb.findById(userId);
  if (!user) throw new Error("User doesnt exists");
  const walletInfo = await walletDb.findOne({ userId: user._id });
  const transactions = await transactionDb.find({ walletId: walletInfo._id }).lean();
  transactions.forEach((t) => {
    t.date = formatDate(t.createdAt).date;
  });

  return { user, walletInfo, transactions };
};

export const addMoneyOrder = async (userId, amount) => {
  if (!amount || amount <= 0) {
    throw new Error("Invalid Amount");
  }
  const wallet = await walletDb.findOne({ userId });
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `wallet_${Date.now()}`,
  });
  const transactions = await transactionDb.create({
    walletId: wallet._id,
    type: "credit",
    amount,
    status: "PENDING",
    description: "Add money to wallet",
    razorpayOrderId: order.id,
  });
  return {
    orderId: order.id,
    amount: order.amount,
    key: process.env.RAZORPAY_KEY_ID,
  };
};

export const verifyRazorpayPayment = async (paymentData) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest("hex");

  if (generated_signature !== razorpay_signature) {
    throw new Error("Invalid payment signature");
  }

  const transaction = await transactionDb.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id },
    {
      status: "COMPLETED",
      razorpayPaymentId: razorpay_payment_id,
    },
    { new: true },
  );

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  await walletDb.findByIdAndUpdate(transaction.walletId, {
    $inc: { availableBalance: transaction.amount, totalEarnings: transaction.amount },
  });

  return { success: true, transaction };
};
