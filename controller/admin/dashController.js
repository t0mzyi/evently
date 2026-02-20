import {
  userDetails,
  eventDetails,
  getRevenueAnalytics,
  formatChartResponse,
  calculateAdminBalance,
  blockAndUnblock,
  userProfile,
} from "../../service/admin/dashService.js";

export const getDash = async (req, res) => {
  try {
    const { period = "daily", startDate, endDate, year, month } = req.query;

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    let currentStartDate = startDate;
    let currentEndDate = endDate;

    if (period === "daily" && (!startDate || !endDate)) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      currentStartDate = start.toISOString().split("T")[0];
      currentEndDate = end.toISOString().split("T")[0];
    }

    const [users, events, rawStats] = await Promise.all([
      userDetails(),
      eventDetails(),
      getRevenueAnalytics({
        period,
        startDate: currentStartDate,
        endDate: currentEndDate,
        year: currentYear,
        month: currentMonth,
      }),
    ]);

    const chartData = formatChartResponse(rawStats);
    const adminBalance = calculateAdminBalance(rawStats);

    res.render("admin/dash", {
      users,
      events,
      chartData,
      adminBalance,
      currentPeriod: period,
      currentYear,
      currentMonth,
      currentStartDate,
      currentEndDate,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      error: "Dashboard failed",
      message: error.message,
    });
  }
};

export const users = async (req, res) => {
  try {
    const page = req.query.p || 1;
    const search = req.query.n || "";
    const sort = req.query.s || "newest";
    const showActiveOnly = req.query.active === "true" ? "true" : "false";

    const userDb = await userDetails(page, search, sort, showActiveOnly);
    res.render("admin/users", { userDb });
  } catch (error) {
    console.error("Users Error:", error);
    res.status(500).json({ error: "Failed to load users" });
  }
};

export const toggleBlockUser = async (req, res) => {
  const { userId, action } = req.params;

  if (!userId || !action) {
    return res.status(400).json({ success: false, message: "Missing userId or action" });
  }

  try {
    const user = await blockAndUnblock(userId, action);
    return res.status(200).json({
      success: true,
      redirectUrl: `/admin/users?status=success&message=${action}ed ${user.firstName || "User"}`,
    });
  } catch (Err) {
    console.error("Toggle Block Error:", Err);
    return res.status(400).json({
      success: false,
      redirectUrl: `/admin/users?status=error&message=${encodeURIComponent(Err.message)}`,
    });
  }
};

export const singleUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await userProfile(userId);
    res.render("admin/viewUser", { user });
  } catch (Err) {
    console.error("Single User Error:", Err.message);
    res.redirect("/admin/users?status=error&message=User+does+not+exist");
  }
};
