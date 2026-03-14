import couponDb from "../../model/couponsDb.js";
import walletDb from "../../model/walletDb.js";

const validateCouponInput = (data, isEdit = false, existingCoupon = null) => {
  const errors = [];
  const { code, discountType, discountValue, minPurchase, maxDiscountAmount, expiryDate, usageLimit } = data;

  if (!code || code.trim() === "") {
    errors.push("Coupon code cannot be empty");
  } else {
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 3) errors.push("Coupon code must be at least 3 characters long");
    if (trimmedCode.length > 20) errors.push("Coupon code cannot exceed 20 characters");
    if (!/^[A-Z0-9_-]+$/.test(trimmedCode)) {
      errors.push("Coupon code can only contain letters, numbers, dashes, and underscores");
    }
  }

  if (!["PERCENTAGE", "FLAT"].includes(discountType)) {
    errors.push("Invalid discount type");
  }

  // Discount Value Validation
  const value = parseFloat(discountValue);
  if (isNaN(value) || value <= 0) {
    errors.push("Discount value must be a positive number");
  } else {
    if (discountType === "PERCENTAGE") {
      if (value >= 100) errors.push("Percentage discount cannot be 100% or more");
    }
  }

  // Minimum Purchase Validation
  const minPurch = parseFloat(minPurchase) || 0;
  if (minPurch < 0) {
    errors.push("Minimum purchase cannot be negative");
  }
  // For FLAT discounts: discount value cannot exceed minPurchase if minPurchase is set
  if (discountType === "FLAT" && value > minPurch && minPurch > 0) {
    errors.push("Flat discount cannot exceed minimum purchase amount");
  }

  // Maximum Discount Amount Validation (PERCENTAGE only)
  if (discountType === "PERCENTAGE") {
    const maxDisc = parseFloat(maxDiscountAmount) ?? 0;
    if (maxDisc < 0) {
      errors.push("Maximum discount amount cannot be negative");
    }
    if (maxDisc > 0 && minPurch > 0) {
      const maxDiscountOnMinPurchase = (minPurch * value) / 100;
      if (maxDisc < maxDiscountOnMinPurchase) {
        errors.push("Maximum discount cannot be less than discount on minimum purchase");
      }
    }
  }

  // Expiry Date Validation
  const expiry = new Date(expiryDate);
  const now = new Date();
  if (isNaN(expiry.getTime())) {
    errors.push("Invalid expiry date format");
  } else {
    if (expiry <= now) errors.push("Expiry date cannot be in the past");
    if (expiry <= new Date(now.getTime() + 60000)) {
      errors.push("Expiry date must be at least 1 minute in the future");
    }
    const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (expiry > oneYear) {
      errors.push("Expiry date cannot be more than 1 year from today");
    }
  }

  // Usage Limit Validation
  if (usageLimit !== undefined && usageLimit !== "") {
    const limit = parseInt(usageLimit);
    if (isNaN(limit) || limit <= 0) {
      errors.push("Usage limit must be a positive number or left empty for unlimited");
    }
    if (isEdit && existingCoupon && limit < existingCoupon.usedCount) {
      errors.push(`Usage limit cannot be less than already used count (${existingCoupon.usedCount})`);
    }
  }

  return errors;
};

export const renderManageCoupons = async (req, res) => {
  try {
    const coupons = await couponDb.find({ type: "ADMIN" }).sort({ createdAt: -1 });
    res.render("admin/coupons/manageCoupons", { coupons });
  } catch (error) {
    console.error("Error in renderManageCoupons:", error);
    res.redirect("/admin/dashboard?status=error&message=Failed to load coupons");
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, minPurchase, maxDiscountAmount, expiryDate, usageLimit, isActive } =
      req.body;

    const validationErrors = validateCouponInput({
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscountAmount,
      expiryDate,
      usageLimit,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors[0] });
    }

    const existing = await couponDb.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = await couponDb.create({
      code: code.toUpperCase(),
      type: "ADMIN",
      discountType,
      discountValue: parseFloat(discountValue),
      eventId: null,
      hostId: null,
      minPurchase: parseFloat(minPurchase) || 0,
      maxDiscountAmount: discountType === "PERCENTAGE" ? parseFloat(maxDiscountAmount) || 0 : 0,
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      usedCount: 0,
      isActive: isActive === "true" || isActive === true,
    });

    res.status(201).json({ success: true, message: "Admin coupon created successfully", coupon });
  } catch (error) {
    console.error("Error in createCoupon:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create coupon" });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { code, discountType, discountValue, minPurchase, maxDiscountAmount, expiryDate, usageLimit, isActive } =
      req.body;

    const coupon = await couponDb.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    if (coupon.type !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Can only edit ADMIN coupons" });
    }

    const validationErrors = validateCouponInput(
      {
        code: code || coupon.code,
        discountType: discountType || coupon.discountType,
        discountValue: discountValue !== undefined ? discountValue : coupon.discountValue,
        minPurchase: minPurchase !== undefined ? minPurchase : coupon.minPurchase,
        maxDiscountAmount: maxDiscountAmount !== undefined ? maxDiscountAmount : coupon.maxDiscountAmount,
        expiryDate: expiryDate || coupon.expiryDate,
        usageLimit: usageLimit !== undefined ? usageLimit : coupon.usageLimit,
      },
      true,
      coupon,
    );

    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors[0] });
    }

    if (code && code.toUpperCase() !== coupon.code) {
      const existing = await couponDb.findOne({ code: code.toUpperCase(), _id: { $ne: couponId } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Coupon code already exists" });
      }
      coupon.code = code.toUpperCase();
    }

    coupon.discountType = discountType || coupon.discountType;
    coupon.discountValue = discountValue !== undefined ? parseFloat(discountValue) : coupon.discountValue;
    coupon.minPurchase = minPurchase !== undefined ? parseFloat(minPurchase) : coupon.minPurchase;
    coupon.maxDiscountAmount =
      discountType === "PERCENTAGE"
        ? maxDiscountAmount !== undefined
          ? parseFloat(maxDiscountAmount) || 0
          : coupon.maxDiscountAmount
        : 0;
    coupon.expiryDate = expiryDate ? new Date(expiryDate) : coupon.expiryDate;
    coupon.usageLimit = usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit) : null) : coupon.usageLimit;
    coupon.isActive = isActive !== undefined ? isActive === "true" || isActive === true : coupon.isActive;

    await coupon.save();

    res.status(200).json({ success: true, message: "Coupon updated successfully", coupon });
  } catch (error) {
    console.error("Error in updateCoupon:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update coupon" });
  }
};

export const toggleCouponActive = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { isActive } = req.body;

    const coupon = await couponDb.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    if (coupon.type !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Can only toggle ADMIN coupons" });
    }

    coupon.isActive = isActive === "true" || isActive === true;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? "activated" : "deactivated"} successfully`,
      isActive: coupon.isActive,
    });
  } catch (error) {
    console.error("Error in toggleCouponActive:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to toggle coupon status" });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await couponDb.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    if (coupon.type !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Can only delete ADMIN coupons" });
    }

    await couponDb.findByIdAndDelete(couponId);

    res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error in deleteCoupon:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete coupon" });
  }
};

export const getCouponStats = async (req, res) => {
  try {
    const now = new Date();

    const totalCoupons = await couponDb.countDocuments({ type: "ADMIN" });
    const activeCoupons = await couponDb.countDocuments({ type: "ADMIN", isActive: true });
    const expiredCoupons = await couponDb.countDocuments({ type: "ADMIN", expiryDate: { $lte: now } });

    const totalUsage = await couponDb.aggregate([
      { $match: { type: "ADMIN" } },
      { $group: { _id: null, totalUsed: { $sum: "$usedCount" } } },
    ]);

    const topCoupons = await couponDb.find({ type: "ADMIN", isActive: true }).sort({ usedCount: -1 }).limit(5);

    res.json({
      success: true,
      stats: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        totalUsage: totalUsage[0]?.totalUsed || 0,
        topCoupons,
      },
    });
  } catch (error) {
    console.error("Error in getCouponStats:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch stats" });
  }
};
