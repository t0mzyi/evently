import couponDb from "../../model/couponsDb.js";
import eventsDb from "../../model/eventsDb.js";

const validateCouponInput = (data, isEdit = false, existingCoupon = null) => {
  const errors = [];
  const { code, discountType, discountValue, minPurchase, maxDiscountAmount, expiryDate, usageLimit, eventId, type } =
    data;

  // Coupon Code Validation
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

  // Discount Type Validation
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
      if (value > 100) errors.push("Percentage discount cannot exceed 100%");
    }
  }

  // Minimum Purchase Validation
  const minPurch = parseFloat(minPurchase) || 0;
  if (minPurch < 0) {
    errors.push("Minimum purchase cannot be negative");
  }
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

  // Business Logic: Event Linking
  if (type === "HOST" && !eventId) {
    errors.push("Host coupons must be linked to a specific event");
  }
  if (type === "ADMIN" && eventId) {
    errors.push("Admin coupons are global and cannot be event-specific");
  }

  return errors;
};

const checkEventTicketPrices = async (eventId, discountType, discountValue, minPurchase) => {
  if (!eventId) return [];
  const event = await eventsDb.findById(eventId);
  if (!event) return ["Event not found"];

  const errors = [];
  const ticketPrices = event.ticketTypes.map((t) => t.price);
  const minTicketPrice = Math.min(...ticketPrices);
  const maxTicketPrice = Math.max(...ticketPrices);

  if (discountType === "FLAT") {
    if (discountValue > maxTicketPrice) {
      errors.push(`Discount (₹${discountValue}) exceeds highest ticket price (₹${maxTicketPrice})`);
    }
    if (discountValue >= minTicketPrice && minPurchase === 0) {
      errors.push(
        `Flat discount equals or exceeds lowest ticket price (₹${minTicketPrice}). Set a minimum purchase to avoid free tickets.`,
      );
    }
  }

  if (discountType === "PERCENTAGE") {
    const maxDiscountAmount = (maxTicketPrice * discountValue) / 100;
    if (minPurchase > 0 && maxDiscountAmount >= minPurchase) {
      errors.push(
        `With ${discountValue}% off, discount on highest ticket (₹${maxDiscountAmount.toFixed(2)}) meets/exceeds minimum purchase. Review your settings.`,
      );
    }
  }

  return errors;
};

export const renderManageCoupons = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.session.user;

    const event = await eventsDb.findById(eventId);
    if (!event || event.hostId.toString() !== userId.toString()) {
      return res.redirect("/dashboard?status=error&message=Unauthorized");
    }

    const coupons = await couponDb
      .find({
        $or: [
          { eventId: eventId, type: "HOST" },
          { eventId: eventId, type: "ADMIN" },
        ],
      })
      .sort({ createdAt: -1 });

    res.render("user/events/manageCoupons", { event, coupons });
  } catch (error) {
    console.error("Error in renderManageCoupons:", error);
    res.redirect("/dashboard?status=error&message=Failed to load coupons");
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.session.user;
    const { code, discountType, discountValue, minPurchase, maxDiscountAmount, expiryDate, usageLimit, isActive } =
      req.body;

    const event = await eventsDb.findById(eventId);
    if (!event || event.hostId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const validationErrors = validateCouponInput({
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscountAmount,
      expiryDate,
      usageLimit,
      eventId,
      type: "HOST",
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors[0] });
    }

    const priceErrors = await checkEventTicketPrices(
      eventId,
      discountType,
      parseFloat(discountValue),
      parseFloat(minPurchase) || 0,
    );
    if (priceErrors.length > 0) {
      return res.status(400).json({ success: false, message: priceErrors[0] });
    }

    const existing = await couponDb.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = await couponDb.create({
      code: code.toUpperCase(),
      type: "HOST",
      discountType,
      discountValue: parseFloat(discountValue),
      eventId,
      hostId: event.hostId,
      minPurchase: parseFloat(minPurchase) || 0,
      maxDiscountAmount: discountType === "PERCENTAGE" ? parseFloat(maxDiscountAmount) || 0 : 0,
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      usedCount: 0,
      isActive: isActive === "true" || isActive === true,
    });

    res.status(201).json({ success: true, message: "Coupon created successfully", coupon });
  } catch (error) {
    console.error("Error in createCoupon:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create coupon" });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { eventId, couponId } = req.params;
    const userId = req.session.user;
    const { code, discountType, discountValue, minPurchase, maxDiscountAmount, expiryDate, usageLimit, isActive } =
      req.body;

    const event = await eventsDb.findById(eventId);
    if (!event || event.hostId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const coupon = await couponDb.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    if (coupon.type !== "HOST" || coupon.eventId.toString() !== eventId) {
      return res.status(403).json({ success: false, message: "Cannot edit this coupon" });
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
        eventId,
        type: "HOST",
      },
      true,
      coupon,
    );

    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors[0] });
    }

    const newDiscountValue = discountValue !== undefined ? parseFloat(discountValue) : coupon.discountValue;
    const newDiscountType = discountType || coupon.discountType;
    const newMinPurchase = minPurchase !== undefined ? parseFloat(minPurchase) : coupon.minPurchase;

    const priceErrors = await checkEventTicketPrices(eventId, newDiscountType, newDiscountValue, newMinPurchase);
    if (priceErrors.length > 0) {
      return res.status(400).json({ success: false, message: priceErrors[0] });
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
    const { eventId, couponId } = req.params;
    const userId = req.session.user;
    const { isActive } = req.body;

    const event = await eventsDb.findById(eventId);
    if (!event || event.hostId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const coupon = await couponDb.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    if (coupon.type !== "HOST" || coupon.eventId.toString() !== eventId) {
      return res.status(403).json({ success: false, message: "Cannot modify this coupon" });
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
    const { eventId, couponId } = req.params;
    const userId = req.session.user;

    const event = await eventsDb.findById(eventId);
    if (!event || event.hostId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const coupon = await couponDb.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    if (coupon.type !== "HOST" || coupon.eventId.toString() !== eventId) {
      return res.status(403).json({ success: false, message: "Cannot delete this coupon" });
    }

    await couponDb.findByIdAndDelete(couponId);

    res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error in deleteCoupon:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete coupon" });
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const { couponCode, eventId, orderTotal } = req.body;

    if (!couponCode || !eventId || !orderTotal) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const coupon = await couponDb.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      expiryDate: { $gt: new Date() },
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or expired coupon code" });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    if (coupon.type === "HOST" && coupon.eventId.toString() !== eventId) {
      return res.status(400).json({ success: false, message: "Coupon not valid for this event" });
    }

    if (parseFloat(orderTotal) < coupon.minPurchase) {
      return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required` });
    }

    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (parseFloat(orderTotal) * coupon.discountValue) / 100;
      // ✅ Apply maxDiscountAmount cap for percentage discounts
      if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, parseFloat(orderTotal));
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    if (discountAmount >= parseFloat(orderTotal)) {
      return res.status(400).json({ success: false, message: "Discount cannot exceed order total" });
    }

    await couponDb.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });

    res.status(200).json({
      success: true,
      discountAmount,
      couponType: coupon.type,
      message: "Coupon applied successfully",
    });
  } catch (error) {
    console.error("Error in applyCoupon:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to apply coupon" });
  }
};

export const getAvailableCoupons = async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log(eventId);
    const now = new Date();

    const coupons = await couponDb
      .find({
        $or: [
          { eventId: eventId, type: "HOST" },
          { eventId: null, type: "ADMIN" },
        ],
        isActive: true,
        expiryDate: { $gt: now },
      })
      .sort({ createdAt: -1 });

    res.json(coupons);
    console.log(coupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
};
