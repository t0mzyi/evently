import userDb from "../../model/userDb.js";
import { userDetails } from "../../service/admin/AdashService.js";
import { updateProfileService, userFinder } from "../../service/user/dashBoardService.js";

export const getProfile = async (req, res) => {
  try {
    const user = await userDb.findById(req.session.user);
    res.render("user/dash/dashboard", { user });
  } catch (err) {
    console.log("err in getProfile", err.message);
  }
};

export const getEditProfile = async (req, res) => {
  try {
    const user = await userDb.findById(req.session.user);
    res.render("user/dash/edit-profile", { user });
  } catch (err) {
    console.log("err in getEditProfile", err.message);
  }
};

export const editProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log(req.body);
    const { firstName, lastName, bio, age } = req.body;
    const updateData = { firstName, lastName, bio, age };
    if (req.file) {
      updateData.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }
    const updatedUser = await updateProfileService(updateData, userId);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      redirectUrl: `/dashboard?status=success&message=${encodeURIComponent("Profile successfully updated")}`,
    });
  } catch (err) {
    console.error("Error in editProfile:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const showHostDashboard = async (req, res) => {
  try {
    const user = await userFinder(req.session.user);
    return res.render("user/dash/hostDashboard", { user });
  } catch (err) {
    console.log(err);
  }
};
