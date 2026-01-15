import { allVenues, venueDetails } from "../../service/user/venueService.js";

export const showVenues = async (req, res) => {
  const page = parseInt(req.query.p) || 1;
  const search = req.query.n || "";
  const type = req.query.t || "all";
  const sort = req.query.s || "name-asc";
  const venueData = await allVenues(page, search, type, sort);

  res.render("venues/venuePage", { venueData });
};

export const singleVenue = async (req, res) => {
  const venue = await venueDetails(req.params.venueId);
  res.render("venues/venueDetails", { venue });
};
