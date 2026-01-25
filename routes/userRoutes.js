import express, { Router } from "express";
import {
  signUp,
  signUpPost,
  otpHandler,
  resentOtp,
  signIn,
  signInPost,
  otpPage,
  forgotPassword,
  forgotPasswordPost,
  resetPassPatch,
  resetPassword,
  logout,
  emailChange,
  emailChanger,
} from "../controller/user/authController.js";
import {
  googleAuth,
  googleAuthCallbackMiddleware,
  googleAuthSuccess,
} from "../controller/user/googleAuthController.js";
import { ifAuth, isAuth, otpVerify, resetPasswordGuard } from "../middlewares/authMiddleware.js";
import { editProfile, getEditProfile, getProfile, showHostDashboard } from "../controller/user/dashBoardController.js";
import { upload, uploadEvent } from "../middlewares/multerUpload.js";
import { foryou } from "../controller/foryouController.js";
import { showVenues, singleVenue } from "../controller/user/venueController.js";
import {
  createEvent,
  editEvent,
  showAllEvents,
  showCreateEvent,
  showSingleEvent,
  updateEvent,
  viewEventHost,
} from "../controller/user/eventsController.js";
import { categories } from "../controller/user/categoryController.js";
import { bookmarks, toggleBookmark } from "../controller/user/bookmarksController.js";
import { bookTicket, cancelTicket, viewTicket } from "../controller/user/ticketController.js";
// import { viewBookmarks } from "../controller/user/bookmarksController.js";
const router = express.Router();

router.get("/", (req, res) => res.redirect("/foryou"));
router.get("/foryou", foryou);

router.get("/signUp", ifAuth, signUp);
router.post("/signUp", ifAuth, signUpPost);

//google auth
router.get("/auth/google", ifAuth, googleAuth);
router.get("/auth/google/callback", ifAuth, googleAuthCallbackMiddleware, googleAuthSuccess);

router.get("/signIn", ifAuth, signIn);
router.post("/signIn", ifAuth, signInPost);

router.get("/otp", otpVerify, otpPage);
router.post("/otp", otpVerify, otpHandler);
router.post("/resend-otp", resentOtp);

//forgotpassword flowwww
router.get("/forgot-password", isAuth, forgotPassword);
router.post("/forgot-password", isAuth, forgotPasswordPost);

//emailChange
router.get("/emailChange", isAuth, emailChange);
router.patch("/emailChange", isAuth, emailChanger);

//resetpassword flow
router.get("/reset-password", resetPasswordGuard, resetPassword);
router.patch("/reset-password", resetPasswordGuard, resetPassPatch);

//auth pages
router.get("/dashboard", isAuth, getProfile);

router.get("/dashboard/editProfile", isAuth, getEditProfile);
router.patch("/dashboard/editProfile", isAuth, upload.single("avatar"), editProfile);
router.get("/dashboard/hostDashboard", showHostDashboard);

//VENUE
router.get("/venues", showVenues);
router.get("/venues/:venueId", singleVenue);

//events
router.get("/events", showAllEvents);
router.get("/events/:eventId", showSingleEvent);
router.get("/createEvent", isAuth, showCreateEvent);
router.get("/editEvent/:eventId", isAuth, editEvent);
router.post("/createEvent", isAuth, uploadEvent.array("galleryImages", 10), createEvent);
router.put("/editEvent/:eventId", isAuth, uploadEvent.array("galleryImages", 10), updateEvent);
router.get("/viewEventHost/:eventId", isAuth, viewEventHost);

//cat
router.get("/categories", categories);

//bookmarks
router.get("/bookmarks", bookmarks);
router.post("/toggleBookmark/:eventId", toggleBookmark);

//ticket
router.get("/bookTickets/:eventId", bookTicket);
router.get("/cancelTickets", cancelTicket);
router.get("/viewTicket", viewTicket);

router.get("/logout", isAuth, logout);
export default router;
