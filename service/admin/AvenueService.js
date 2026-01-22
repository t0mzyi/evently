import venueDb from "../../model/venueDb.js";

export const venueList = async (page, search, type, sortQuery) => {
  const limit = 5;
  const totalVenues = await venueDb.countDocuments({});
  const activeVenues = await venueDb.countDocuments({ isActive: true });
  const filter = {};
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }
  if (type && type != "all") {
    filter.type = type;
  }
  let sort = {};
  if (sortQuery == "name-asc") sort = { name: 1 };
  else if (sortQuery == "name-desc") sort = { name: -1 };
  else if (sortQuery == "capacity-asc") sort = { capacity: 1 };
  else if (sortQuery == "capacity-desc") sort = { capacity: -1 };
  console.log(sort);

  const venues = await venueDb
    .find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
  const totalPages = Math.ceil(totalVenues / limit);
  return {
    venues,
    totalVenues,
    activeVenues,
    totalPages,
    currentPage: parseInt(page),
    searchQuery: search,
    selectedType: type,
    selectedSort: sortQuery,
  };
};

export const venueFinder = async (venueId) => {
  const venue = await venueDb.findById(venueId);
  if (!venue) {
    throw new Error("no venue exsits");
  }
  return venue;
};

export const createVenue = async (venueData, files) => {
  if (!files || files.length === 0) {
    throw new Error("At least one image is required");
  }
  const imagePaths = files.map((file) => `/uploads/venues/${file.filename}`);

  const structuredAmenities = [];
  const { amenity_key, amenity_value } = venueData;

  if (amenity_key && Array.isArray(amenity_key)) {
    amenity_key.forEach((key, index) => {
      if (key.trim() !== "") {
        structuredAmenities.push({
          key: key,
          value: amenity_value[index] || "",
        });
      }
    });
  }
  const venue = await venueDb.create({
    name: venueData.name,
    type: venueData.type,
    capacity: venueData.capacity,
    address: venueData.address,
    map_url: venueData.maps_url,
    description: venueData.description,
    image_url: imagePaths,
    amenities: structuredAmenities,
  });

  return venue;
};

export const updateVenueService = async (venueId, venueData, newFiles) => {
  const remainingImages = JSON.parse(venueData.remaining_images || "[]");
  const newImagePaths = newFiles ? newFiles.map((file) => `/uploads/venues/${file.filename}`) : [];
  const finalImageArray = [...remainingImages, ...newImagePaths];

  if (finalImageArray.length === 0) {
    throw new Error("At least one image is required");
  }
  const structuredAmenities = [];
  if (venueData["amenity_key[]"]) {
    const keys = Array.isArray(venueData["amenity_key[]"]) ? venueData["amenity_key[]"] : [venueData["amenity_key[]"]];
    const values = Array.isArray(venueData["amenity_value[]"])
      ? venueData["amenity_value[]"]
      : [venueData["amenity_value[]"]];
    keys.forEach((key, index) => {
      if (key.trim() !== "") {
        structuredAmenities.push({
          key: key.trim(),
          value: values[index] ? values[index].trim() : "",
        });
      }
    });
  }

  const updatedVenue = await venueDb.findByIdAndUpdate(
    venueId,
    {
      name: venueData.name,
      type: venueData.type,
      capacity: venueData.capacity,
      address: venueData.address,
      map_url: venueData.map_url,
      description: venueData.description,
      image_url: finalImageArray,
      amenities: structuredAmenities,
    },
    { new: true },
  );

  return updatedVenue;
};
