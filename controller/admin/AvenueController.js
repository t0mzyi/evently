import { createVenue } from "../../service/admin/AvenueService.js";

export const showVenues = (req, res) => {
  res.render("admin/venue/venues");
};
export const showAddVenue = (req, res) => {
  res.render("admin/venue/addVenue");
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
