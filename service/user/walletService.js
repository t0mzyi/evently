import razorpay from "../../config/razorpay.js";
import transactionDb from "../../model/transactionsDb.js";
import userDb from "../../model/userDb.js";
import crypto from "crypto";
import walletDb from "../../model/walletDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";

export const walletDetails = async (userId, page = 1, limit = 10, filters = {}) => {
  try {
    const user = await userDb.findById(userId);
    if (!user) throw new Error("User doesnt exists");

    const walletInfo = await walletDb.findOne({ userId: user._id });
    const query = { walletId: walletInfo._id };
    if (filters.type && filters.type !== "all") {
      query.type = filters.type;
    }
    if (filters.search) {
      query.$or = [
        { description: { $regex: filters.search, $options: "i" } },
        { amount: { $regex: filters.search, $options: "i" } },
        { status: { $regex: filters.search, $options: "i" } },
      ];
    }
    const skip = (page - 1) * limit;
    const totalTransactions = await transactionDb.countDocuments(query);
    let sortQuery = { createdAt: -1 };

    if (filters.sort === "date_asc") {
      sortQuery = { createdAt: 1 };
    } else if (filters.sort === "amount_desc") {
      sortQuery = { amount: -1 };
    } else if (filters.sort === "amount_asc") {
      sortQuery = { amount: 1 };
    } else if (filters.sort === "status") {
      sortQuery = { status: 1 };
    }
    const transactions = await transactionDb.find(query).sort(sortQuery).skip(skip).limit(limit).lean();

    transactions.forEach((t) => {
      t.date = formatDate(t.createdAt);
    });
    const totalPages = Math.ceil(totalTransactions / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      user,
      walletInfo,
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        limit,
        skip,
        hasNextPage,
        hasPrevPage,
        filters: {
          search: filters.search || "",
          sort: filters.sort || "date_desc",
          type: filters.type || "all",
        },
      },
    };
  } catch (error) {
    console.log("Error in walletDetails", error);
    throw error;
  }
};

export const addMoneyOrder = async (userId, amount) => {
  try {
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
      paymentMethod: "Razorpay",
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
  } catch (error) {
    console.log("Error in addMoney Order", error);
  }
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

export const refundWallet = async (userId, amount, reason) => {
  const wallet = await walletDb.findOneAndUpdate(
    { userId, userId },
    {
      $inc: { availableBalance: amount },
    },
    { new: true },
  );
  await transactionDb.create({
    walletId: wallet._id,
    userId: userId,
    type: "credit",
    amount: amount,
    description: reason,
    status: "COMPLETED",
  });
  console.log(`Refunded ${amount} to Wallet ${walletId} (User ${userId})`);
};

export const updateTransactionStatus = async (orderId, status) => {
  try {
    await transactionDb.findOneAndUpdate({ razorpayOrderId: orderId }, { status: status });
  } catch (error) {
    console.error("Error updating transaction status:", error);
  }
};

export const addMoneyWallet = async (userId, amount, description, order) => {
  const walletUpdate = await walletDb.findOneAndUpdate(
    { userId: userId },
    {
      $inc: { availableBalance: amount, totalEarnings: amount },
    },
    { new: true },
  );
  if (walletUpdate) {
    await transactionDb.create({
      walletId: walletUpdate._id,
      userId: userId,
      eventId: order.eventId,
      orderId: order._id,
      type: "credit",
      amount: amount,
      description: description,
      status: "COMPLETED",
    });
  } else {
    throw new Error(`Wallet update failed ${userId}`);
  }
};

export const debitWallet = async (userId, amount, description, order) => {
  const walletUpdate = await walletDb.findOneAndUpdate(
    { userId: userId },
    {
      $inc: { availableBalance: -amount, totalEarnings: -amount },
    },
    { new: true },
  );
  if (walletUpdate) {
    await transactionDb.create({
      walletId: walletUpdate._id,
      userId: userId,
      eventId: order.eventId,
      orderId: order._id,
      type: "debit",
      amount: amount,
      description: description,
      status: "COMPLETED",
    });
    console.log(`Money debited from ${userId} ${amount} for ${description}`);
  } else {
    throw new Error(`Wallet update failed ${userId}`);
  }
};
