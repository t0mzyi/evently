import userDb from "../model/userDb.js";

export const otpVerify = (req, res, next) => {
  const otpRequested = req.session.otpRequested;
  if (!otpRequested) {
    return res.redirect("/signUp");
  }
  return next();
};

export const resetPasswordGuard = (req, res, next) => {
  if (req.session.canResetPassword) {
    return next();
  }
  return res.redirect("/forgot-password");
};
``;

export const isAuth = async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await userDb.findById(req.session.user);

      if (!user) {
        req.session.user = null;
        return res.redirect("/signIn?status=error&message=Please%20login%20again");
      }

      if (user.isBlocked) {
        req.session.user = null;
        return res.redirect("/signIn?status=error&message=You%20have%20been%20blocked");
      }

      return next();
    }
    return res.redirect(`/signIn?status=error&message=${encodeURIComponent("Please login")}`);
  } catch (error) {
    console.error("isAuth error:", error);
    return res.redirect("/signIn?status=error&message=Authentication%20error");
  }
};

export const ifAuth = (req, res, next) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  return next();
};

export const isAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    return next();
  }
  return res.redirect("/admin");
  next();
};

export const ifAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    return res.redirect("/admin/dashboard");
  }
  return next();
};
