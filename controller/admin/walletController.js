import transactionDb from "../../model/transactionsDb.js";
import walletDb from "../../model/walletDb.js";
// 698cbef296468910eaf52c9a

export const showWallet = async (req, res) => {
  let platformWallet = await walletDb.findOne({ type: "PLATFORM" });
  platformWallet.balance = platformWallet.availableBalance.toString();
  platformWallet.te = platformWallet.totalEarnings.toString();

  const transactions = await transactionDb.find({ walletId: platformWallet._id });
  console.log(transactions);
  res.render("admin/admin-wallet", { wallet: platformWallet, transactions });
};
