import venueDb from "../../model/venueDb.js";

export const allVenues = async (
  page = 1,
  searchQuery = "",
  type = "all",
  sort = "name-asc",
  limit = 3
) => {
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

  const venues = await venueDb
    .find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);
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
