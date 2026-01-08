import {
  createVenue,
  venueFinder,
  venueList,
  updateVenueService,
} from "../../service/admin/AvenueService.js";

export const showVenues = async (req, res) => {
  const page = req.query.p || 1;
  const { venues, activeVenues, totalVenues, totalPages, currentPage } =
    await venueList(page);
  res.render("admin/venue/venues", {
    venues,
    totalVenues,
    activeVenues,
    currentPage,
    totalPages,
  });
};
export const showAddVenue = (req, res) => {
  res.render("admin/venue/addVenue");
};
export const showEditVenue = async (req, res) => {
  try {
    const venue = await venueFinder(req.params.venueId);
    res.render("admin/venue/editVenue", { venue });
  } catch (error) {
    console.log(error);
  }
};

export const editVenue = async (req, res) => {
  try {
    const venueId = req.params.venueId;
    const result = await updateVenueService(venueId, req.body, req.files);

    res.status(200).json({
      success: true,
      message: "Venue updated successfully",
      venue: result,
    });
  } catch (error) {
    console.error("Update Controller Error:", error.message);

    if (error.message === "At least one image is required") {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const addVenue = async (req, res) => {
  try {
    const savedVenue = await createVenue(req.body, req.files);
    res.status(201).json({
      success: true,
      message: "Venue created successfully",
      venueId: savedVenue._id,
    });
  } catch (error) {
    console.error("Controller Error", error.message);
    if (error.message === "At least one image is required") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};
