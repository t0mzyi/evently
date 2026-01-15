import userDb from "../model/userDb.js";

export const otpGuard = (req, res, next) => {
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

export const isAuth = async (req, res, next) => {
  if (req.session.user) {
    const user = await userDb.findById(req.session.user);
    if (!user.isBlocked) {
      return next();
    }
  }
  return res.redirect(
    `/signIn?status=error&message=${encodeURIComponent("Please login")}`
  );
};

export const ifAuth = (req, res, next) => {
  if (req.session && req.session.user) {
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
    return res.redirect("/admin/dash");
  }
  return next();
};
