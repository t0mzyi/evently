import { allVenues, venueDetails } from "../../service/user/venueService.js";

export const showVenues = async (req, res) => {
  const venues = await allVenues();
  console.log(venues);
  res.render("venues/venuePage", { venues });
};

export const singleVenue = async (req, res) => {
  const venue = await venueDetails(req.params.venueId);
  res.render("venues/venueDetails", { venue });
};
