import walletDb from "../../model/walletDb.js";
import { addMoneyOrder, verifyRazorpayPayment, walletDetails } from "../../service/user/walletService.js";
import crypto from "crypto";

export const showWallet = async (req, res) => {
  const user = req.session.user;
  const details = await walletDetails(user);

  res.render("user/dash/wallet", { details });
};

export const addMoney = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount); // ← Convert to number
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    const userId = req.session.user;
    const data = await addMoneyOrder(userId, amount);
    res.status(200).json({
      success: true,
      message: "Order created successfully",
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const result = await verifyRazorpayPayment(req.body);

    res.json({ success: true });
  } catch (error) {
    console.error("Payment verification failed:", error.message);

    // Map service errors to HTTP responses
    if (error.message === "Invalid payment signature") {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    if (error.message === "Transaction not found") {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Unexpected errors
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};
