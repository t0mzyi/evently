import venueDb from "../../model/venueDb.js";

export const createVenue = async (venueData, files) => {
  if (!files || files.length === 0) {
    throw new Error("At least one image is required");
  }
  const imagePaths = files.map((file) => `/uploads/venues/${file.filename}`);

  // 2. Process Amenities
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
