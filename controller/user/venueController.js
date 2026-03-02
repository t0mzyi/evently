import reviewDb from "../../model/reviewDb.js";
import userDb from "../../model/userDb.js";
import { addReview, allVenues, deleteReview, venueDetails } from "../../service/user/venueService.js";
import { formatDate } from "../../utils/dateTimeFormator.js";

export const showVenues = async (req, res) => {
  const page = parseInt(req.query.p) || 1;
  const search = req.query.n || "";
  const type = req.query.t || "all";
  const sort = req.query.s || "name-asc";
  const venueData = await allVenues(page, search, type, sort);

  res.render("user/venues/venuePage", { venueData });
};

export const singleVenue = async (req, res) => {
  const venue = await venueDetails(req.params.venueId);
  let allReviews = await reviewDb
    .find({ venueId: req.params.venueId, isDeleted: false })
    .populate("userId", "firstName avatarUrl lastName")
    .lean();
  if (req.session.user) {
    allReviews.forEach((r) => {
      r.isOwner = r.userId._id == req.session.user;
    });
  }
  allReviews.forEach((r) => {
    r.userName = r.userId.firstName + " " + r.userId.lastName;
    r.date = formatDate(r.createdAt).date;
    r.avatarUrl = r.userId.avatarUrl;
  });

  res.render("user/venues/venueDetails", { venue, reviews: allReviews, currentUserId: req.session.user || null });
};

export const addReviewVenue = async (req, res) => {
  try {
    const review = await addReview(req.session.user, req.body);
    res.status(200).json({ success: true, review });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReviewVenue = async (req, res) => {
  try {
    const reviewId = req.body.id;
    const userId = req.session.user;
    await deleteReview(userId, reviewId);
    res.status(204).json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
