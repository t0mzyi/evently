import venueDb from "../../model/venueDb.js";

export const allVenues = async () => {
  const venue = await venueDb.find({});
  return venue;
};

export const venueDetails = async (id) => {
  const venueDetails = await venueDb.findById(id);
  return venueDetails;
};
