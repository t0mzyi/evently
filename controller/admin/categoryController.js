import { categoryCreator, categoryUpdater, editCategory } from "../../service/admin/categoryService.js";
import { allCategories, category } from "../../service/admin/categoryService.js ";
import { formatDate } from "../../utils/dateTimeFormator.js";

export const showCategories = async (req, res) => {
  const categories = await allCategories();
  res.render("admin/categories/admin-categories", { categories });
};
export const showSingleCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const cat = await category(categoryId);
    const date = formatDate(cat?.createdAt);
    cat.date = date;
    let avgTicketPrice = 0;
    if (cat.events && cat.events.length > 0) {
      let totalPrice = 0;
      let ticketCount = 0;

      cat.events.forEach((event) => {
        if (event.ticketTypes && event.ticketTypes.length > 0) {
          event.ticketTypes.forEach((ticket) => {
            if (ticket.price && ticket.price > 0) {
              totalPrice += ticket.price;
              ticketCount++;
            }
          });
        }
      });

      avgTicketPrice = ticketCount > 0 ? (totalPrice / ticketCount).toFixed(2) : 0;
    }
    const liveEvents = cat.events.filter((e) => e.status === "live").length;
    const totalCapacity = cat.events.reduce((sum, e) => sum + (e.totalCapacity || 0), 0);
    const totalEvents = cat.events.length;
    res.render("admin/categories/view-category", {
      cat,
      avgTicketPrice,
      liveEvents,
      totalCapacity,
      totalEvents,
    });
  } catch (error) {
    console.log("error in singleCategory", error);
    res.redirect("/admin/categories?status=error&message=Category+not+found");
  }
};

export const showAddCategory = async (req, res) => {
  res.render("admin/categories/add-category");
};

export const addCategory = async (req, res) => {
  try {
    const newCategory = await categoryCreator(req.body);
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      redirectUrl: `/admin/category/${newCategory._id}?status=success&message=Category Created SuccessFull`,
    });
  } catch (error) {
    console.log("add category Error", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create category",
    });
  }
};

export const showEditCategory = async (req, res) => {
  try {
    const category = await editCategory(req.params.categoryId);
    res.render("admin/categories/edit-category", { category });
  } catch (error) {
    res.redirect(`/admin/categories?status=error&message=${error.message}`);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, iconUrl, description, colorHex } = req.body;
    const body = { name, iconUrl, description, colorHex };
    const updatedCategory = await categoryUpdater(req.params.categoryId, body);
    console.log(req.body);
    res.json({
      success: true,
      message: "Category updated successfully",
      redirectUrl: `/admin/category/${updatedCategory._id}?status=success&message=Category updated successfulls`,
    });
  } catch (error) {
    console.error("error in updateCat", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update category",
    });
  }
};
