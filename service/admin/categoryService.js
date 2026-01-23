import categoryDb from "../../model/categoryDb.js";

export const allCategories = async (req, res) => {
  const categories = await categoryDb.find();
  return categories;
};
export const category = async (id) => {
  const cat = await categoryDb.findById(id).populate("events");
  if (!cat) throw new Error("category doesnt Found");
  return cat;
};

export const categoryCreator = async (body) => {
  const { name, iconUrl, description, colorHex } = body;
  if (!name?.trim()) {
    throw new Error("Category name is required");
  }
  if (!description?.trim()) {
    throw new Error("Description is required");
  }
  if (!iconUrl?.trim()) {
    throw new Error("Icon (emoji) is required");
  }
  if (!colorHex) {
    throw new Error("Theme color is required");
  }

  // Validate emoji format (optional but recommended)
  const emojiRegex = /^[\p{Emoji}]{1,4}$/u;
  if (!emojiRegex.test(iconUrl)) {
    throw new Error("Icon must be a valid emoji (1-4 characters)");
  }

  // Validate hex color format
  if (!/^#[0-9A-F]{6}$/i.test(colorHex)) {
    throw new Error("Invalid color format. Use #RRGGBB");
  }

  const existing = await categoryDb.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  });
  if (existing) {
    throw new Error("A category with this name already exists");
  }
  const newCategory = new categoryDb({
    name: name.trim(),
    description: description.trim(),
    iconUrl: iconUrl.trim(),
    colorHex: colorHex,
  });

  return await newCategory.save();
};

export const editCategory = async (id) => {
  const cat = await categoryDb.findById(id);
  if (!cat) throw new Error("No category exists");
  return cat;
};

export const categoryUpdater = async (id, data) => {
  const updated = await categoryDb.findByIdAndUpdate(id, data, {
    new: true,
  });

  if (!updated) {
    throw new Error("Category not found");
  }

  return updated;
};
