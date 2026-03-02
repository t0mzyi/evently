import reviewDb from "../../model/reviewDb.js";
import userDb from "../../model/userDb.js";
import venueDb from "../../model/venueDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";

export const allVenues = async (page = 1, searchQuery = "", type = "all", sort = "name-asc", limit = 3) => {
  const skip = (page - 1) * limit;
  //name
  const filter = {};
  filter.name = { $regex: searchQuery, $options: "i" };

  //sort
  if (type != "all") {
    filter.type = { $regex: new RegExp(`^${type}$`, "i") };
  }

  //sortt
  let sortOptions = { name: 1 };
  if (sort === "name-desc") sortOptions = { name: -1 };
  else if (sort === "capacity-desc") sortOptions = { capacity: -1 };
  else if (sort === "capacity-asc") sortOptions = { capacity: 1 };

  const venues = await venueDb.find(filter).sort(sortOptions).skip(skip).limit(limit);
  const totalVenues = await venueDb.countDocuments(filter);

  return {
    venues,
    totalVenues,
    currentPage: page,
    totalPages: Math.ceil(totalVenues / limit),
    searchQuery,
    selectedType: type,
    selectedSort: sort,
  };
};

export const venueDetails = async (id) => {
  const venueDetails = await venueDb.findById(id);
  return venueDetails;
};

export const addReview = async (userId, body) => {
  const venueId = body.venueId;
  const rating = body.rating;
  const comment = body.comment;

  if (!rating || !comment) {
    throw new Error("Please enter all fields");
  }
  const venue = await venueDb.findById(venueId);
  if (!venue) {
    throw new Error("Unavailable Venue");
  }

  const review = await reviewDb.create({
    userId: userId,
    venueId: venueId,
    rating,
    comment,
  });
  const user = await userDb.findById(userId);
  const userName = user.firstName + " " + user.lastName;
  const formattedReview = {
    _id: review._id.toString(),
    rating: review.rating,
    comment: review.comment,
    userName: userName,
    avatarUrl: user?.avatarUrl || null,
    date: formatDate(review.createdAt).date,
    isOwner: true,
  };
  console.log(formattedReview);
  return formattedReview;
};

export const deleteReview = async (userId, reviewId) => {
  if (!reviewId) {
    throw new Error("Review ID is required");
  }
  const review = await reviewDb.findById(reviewId);
  const isUserOwner = review.userId == userId;
  console.log(isUserOwner);
  if (isUserOwner) {
    reviewDb.updateOne({ _id: review._id }, { isDeleted: true });
    return;
  }
  throw new Error("You are not the one who added this review");
};
