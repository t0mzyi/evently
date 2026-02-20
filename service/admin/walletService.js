import transactionDb from "../../model/transactionsDb.js";
import walletDb from "../../model/walletDb.js";
const walletId = "698cbef296468910eaf52c9a";

export const creditAdminWallet = async (amount, desc) => {
  try {
    const updateWallet = await walletDb.findByIdAndUpdate(
      walletId,
      { $inc: { availableBalance: amount, totalEarnings: amount } },
      { new: true },
    );
    if (updateWallet) {
      await transactionDb.create({
        walletId,
        type: "credit",
        amount: amount,
        description: desc,
        status: "COMPLETED",
      });
    }
  } catch (error) {
    console.log("Error in creditAdminWallet", error);
  }
};
