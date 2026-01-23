import { categoryCreator, editCategory } from "../../service/admin/categoryService.js";
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
    res.render("admin/categories/view-category", { cat });
  } catch (error) {
    console.log("error in singleCategory", error);
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
      redirectUrl: "/admin/categories?status=success&message=Category Created SuccessFull",
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
    const category = editCategory(req.params.categoryId);
    res.render("admin/categories/edit-category", { category });
  } catch (error) {
    res.redirectUrl(`/admin/categories?status=error&message=${error.message}`);
  }
};
