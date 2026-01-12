import {
  blockAndUnblock,
  eventDetails,
  userDetails,
  userProfile,
} from "../../service/admin/AdashService.js";

export const getDash = async (req, res) => {
  const users = await userDetails();
  const events = await eventDetails();
  res.render("admin/dash", { users, events });
};

export const users = async (req, res) => {
  const page = req.query.p || 1;
  const filter = req.query.n || "";
  const userDb = await userDetails(page, filter);
  console.log;
  res.render("admin/users", { userDb });
};

export const toggleBlockUser = async (req, res) => {
  const { userId, action } = req.params;
  if (!userId || !action) {
    throw new Error("No userId or action found");
  }
  console.log(action);
  try {
    const user = await blockAndUnblock(userId, action);
    if (!user) {
      return res.status(400).json({
        success: false,
        redirectUrl: `/admin/users?status=error&message=${encodeURIComponent(
          "update failed"
        )}`,
      });
    }
    return res.status(200).json({
      success: true,
      redirectUrl: `/admin/users?status=success&message=${action}ed ${user.firstName}`,
    });
  } catch (Err) {
    console.log("err from toggle ", Err);
  }
};

export const singleUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await userProfile(userId);
    res.render("admin/viewUser", { user });
  } catch (Err) {
    console.log(Err.message);
    res.redirect("/admin/users?status=error&message=User doest exsits");
  }
};
