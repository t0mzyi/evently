import categoryDb from "../../model/categoryDb.js";

export const categories = async (req, res) => {
  const categories = await categoryDb.find().populate({
    path: "events",
    select: "title description galleryImages",
    match: { status: "live" },
  });
  res.render("user/category/category", { categories });
};
