import { render } from "ejs";
import {
  signUpVerify,
  signInVerify,
  resendOtpService,
  forgotPassVerify,
  verifyOtp,
  createUser,
  updatePassword,
  forgotPassSessionExists,
  updateEmail,
} from "../../service/user/authService.js";
import bcrypt from "bcrypt";
import { otpCreator } from "../../utils/otpGenerator.js";

export const signUp = (req, res) => {
  res.render("user/auth", { mode: "register" });
};

export const signIn = (req, res) => {
  return res.render("user/auth", { mode: "login" });
};

export const forgotPassword = async (req, res) => {
  if (req.session.user) {
    const user = await forgotPassSessionExists(req.session.user);
    req.session.otpRequested = true;
    req.session.forgotPassEmail = user.emailAddress;
    return res.redirect("/otp");
  }
  return res.render("user/forgot-password");
};

export const emailChange = async (req, res) => {
  res.render("user/emailChange");
};

export const emailChanger = async (req, res) => {
  try {
    const { emailAddress } = req.body;

    if (!emailAddress) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    req.session.newEmail = emailAddress;
    req.session.otpRequested = true;
    await otpCreator(emailAddress);
    return res.status(200).json({
      success: true,
      redirectUrl: "/otp",
    });
  } catch (err) {
    console.error("Error in emailChanger:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Could not send OTP.",
    });
  }
};

export const otpPage = (req, res) => {
  if (req.session.user) {
    return res.render("user/otp", { user: req.session.user });
  }
  return res.render("user/otp");
};
export const resetPassword = (req, res) => {
  return res.render("user/reset-password", { user: req.session.user });
};

export const forgotPasswordPost = async (req, res) => {
  try {
    const { emailAddress } = req.body;

    req.session.tempUserData = null;
    req.session.forgotPassEmail = emailAddress;
    await forgotPassVerify(emailAddress);

    req.session.otpRequested = true;

    return res.status(200).json({
      success: true,
      redirectUrl: "/otp",
    });
  } catch (err) {
    console.log(`error in forgotPasswordPost`, err.message);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const resetPassPatch = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const email = req.session.forgotPassEmail;

    if (!email || !newPassword) {
      return res.status(403).json({
        success: false,
        message: "Session expired or some error please redo again.",
      });
    }

    await updatePassword(email, newPassword);

    req.session.forgotPassEmail = null;
    req.session.canResetPassword = null;
    req.session.otpRequested = false;

    return res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error("Error in resetPasswordPatch:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update password. Please try again.",
    });
  }
};

export const otpHandler = async (req, res) => {
  try {
    const { otp } = req.body;
    const { tempUserData, forgotPassEmail, newEmail } = req.session;

    const targetEmail =
      tempUserData?.emailAddress || forgotPassEmail || newEmail;
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: "Session exipired please login again",
      });
    }

    await verifyOtp(targetEmail, otp);

    req.session.otpRequested = false;

    if (tempUserData) {
      const newUser = await createUser(tempUserData);
      req.session.tempUserData = null;
      req.session.user = newUser._id;
      return res.status(200).json({ success: true, redirectUrl: "/foryou" });
    } else if (forgotPassEmail) {
      req.session.canResetPassword = true;
      return res
        .status(200)
        .json({ success: true, redirectUrl: "/reset-password" });
    } else if (newEmail) {
      await updateEmail(req.session.newEmail, req.session.user);
      req.session.newEmail = null;
      return res.status(200).json({
        success: true,
        redirectUrl: "/dashboard?status=success&message= email update done",
      });
    }
    return res
      .status(400)
      .json({ success: false, message: "Invalid session state" });
  } catch (err) {
    console.log(`err in otpHandler`, err.message);
    return res.status(400).json({
      success: false,
      message: err.message || "OTP verification failed",
    });
  }
};

export const signInPost = async (req, res) => {
  try {
    const user = await signInVerify(req.body);
    req.session.user = user._id;

    return res.status(200).json({
      success: true,
      redirectUrl: "/foryou",
    });
  } catch (err) {
    console.log(`error in signInPost`, err.message);
    let statusCode = 401;
    if (err.message.includes("blocked")) statusCode = 403;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
};

export const signUpPost = async (req, res) => {
  try {
    await signUpVerify(req.body);

    req.session.tempUserData = req.body;
    const hashedPass = await bcrypt.hash(req.session.tempUserData.password, 10);
    req.session.tempUserData.password = hashedPass;

    req.session.otpRequested = true;

    return res.status(200).json({
      success: true,
      redirectUrl: "/otp",
    });
  } catch (error) {
    console.log(`err in signUpPost`, error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const resentOtp = async (req, res) => {
  try {
    const email =
      req.session.tempUserData?.emailAddress ||
      req.session.forgotPassEmail ||
      req.session.newEmail;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Session expired please retry the process again",
      });
    }
    const result = await resendOtpService(email);
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    console.log("err in resentOtp", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to resnt otp please try again",
    });
  }
};

export const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.redirect("/dashboard?status=error&message=Logout failed");
      }

      res.clearCookie("connect.sid");
      return res.redirect(
        "/signIn?status=success&message=Successfully logged out"
      );
    });
  } catch (err) {
    console.error("Error in logout:", err);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};
