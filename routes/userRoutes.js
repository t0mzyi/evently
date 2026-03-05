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
import { addReviewVenue, deleteReviewVenue, showVenues, singleVenue } from "../controller/user/venueController.js";
import {
  addEventReview,
  createEvent,
  deleteEventReview,
  editEvent,
  handlepayAndPublish,
  payandpublish,
  showAllEvents,
  showAttenties,
  showCreateEvent,
  showSingleEvent,
  updateEvent,
  viewEventHost,
} from "../controller/user/eventsController.js";
import { categories } from "../controller/user/categoryController.js";
import { bookmarks, toggleBookmark } from "../controller/user/bookmarksController.js";
import {
  bookTicket,
  checkoutPage,
  createRazorpayOrder,
  handleUnreservingTicket,
  processCheckout,
  showCancelTicket,
  showMybookings,
  ticketBooking,
  ticketCancelAndRefund,
  verifyRazorpayPayment,
  viewOrderTickets,
  viewTicket,
} from "../controller/user/ticketController.js";
import { addMoney, cancelPayment, showWallet, verifyPayment } from "../controller/user/walletController.js";
import { unReserveTicket } from "../service/user/ticketsService.js";
import { showCalender } from "../controller/user/calenderController.js";
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

//dash pages

router.get("/dashboard", isAuth, getProfile);
router.get("/dashboard/editProfile", isAuth, getEditProfile);
router.patch("/dashboard/editProfile", isAuth, upload.single("avatar"), editProfile);
router.get("/dashboard/hostDashboard", showHostDashboard);
router.get("/dashboard/myBookings", showMybookings);
router.get("/dashboard/calendar", showCalender);

//VENUE
router.get("/venues", showVenues);
router.get("/venues/:venueId", singleVenue);
router.post("/venue/review", isAuth, addReviewVenue);
router.delete("/venue/review", isAuth, deleteReviewVenue);

//events
router.get("/events", showAllEvents);
router.get("/events/:eventId", showSingleEvent);
router.get("/createEvent", isAuth, showCreateEvent);
router.get("/editEvent/:eventId", isAuth, editEvent);
router.post("/createEvent", isAuth, uploadEvent.array("galleryImages", 10), createEvent);
router.put("/editEvent/:eventId", isAuth, uploadEvent.array("galleryImages", 10), updateEvent);
router.get("/viewEventHost/:eventId", isAuth, viewEventHost);
router.get("/payAndPublish/:eventId", isAuth, payandpublish);
router.post("/payAndPublish", isAuth, handlepayAndPublish);
router.get("/:eventId/attendees", showAttenties);
router.post("/event/reviews", addEventReview);
router.delete("/event/reviews", deleteEventReview);

//cat
router.get("/categories", categories);

//bookmarks
router.get("/bookmarks", isAuth, bookmarks);
router.post("/toggleBookmark/:eventId", isAuth, toggleBookmark);

//ticket
router.get("/bookTickets/:eventId", isAuth, bookTicket);
router.post("/bookTickets", isAuth, ticketBooking);
router.get("/tickets/cancel/:orderId", isAuth, showCancelTicket);
router.get("/ticket/view", isAuth, viewTicket);
router.get("/ticket/checkout/:orderId", isAuth, checkoutPage);
router.post("/ticket/checkout", isAuth, processCheckout);
router.post("/ticket/unreserve/:orderId", isAuth, handleUnreservingTicket);
router.get("/tickets/:orderId", isAuth, viewOrderTickets);
router.post("/tickets/cancel", isAuth, ticketCancelAndRefund);
router.post("/ticket/createRazorpayOrder", isAuth, createRazorpayOrder);
router.post("/ticket/verifyRazorpayPayment", isAuth, verifyRazorpayPayment);

//wallet
router.get("/dashboard/wallet", isAuth, showWallet);
router.post("/wallet/addMoney", isAuth, addMoney);
router.post("/wallet/verifyPayment", isAuth, verifyPayment);
router.post("/wallet/cancelPayment", isAuth, cancelPayment);

router.get("/logout", isAuth, logout);
export default router;
