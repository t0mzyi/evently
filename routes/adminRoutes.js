import express from "express";
import { AloginGet, AloginPost } from "../controller/admin/login.js";
import { getDash, singleUser, toggleBlockUser, users } from "../controller/admin/dashController.js";
import { addVenue, editVenue, showAddVenue, showEditVenue, showVenues } from "../controller/admin/venueController.js";
import { uploadVenue } from "../middlewares/multerUpload.js";
import { ifAdmin, isAdmin } from "../middlewares/flowMiddleware.js";
import {
  approveEvent,
  featureEvent,
  rejectEvent,
  showEvents,
  showSingleEvent,
  unFeatureEvent,
} from "../controller/admin/eventsController.js";
import {
  addCategory,
  showAddCategory,
  showCategories,
  showEditCategory,
  showSingleCategory,
} from "../controller/admin/categoryController.js";

const router = express.Router();

router.get("/", (req, res) => res.redirect("/admin/login"));

router.get("/login", ifAdmin, AloginGet);
router.post("/login", AloginPost);

router.get("/users", isAdmin, users);
router.get("/users/:userId", singleUser);

//venueSide
router.get("/venues", isAdmin, showVenues);
router.get("/venues/add", isAdmin, showAddVenue);
router.post("/venues/add", uploadVenue.array("images[]", 10), addVenue);
router.get("/venues/:venueId/edit", isAdmin, showEditVenue);
router.patch("/venues/:venueId/edit", uploadVenue.array("images[]", 10), editVenue);

//events Side
router.get("/events", showEvents);
router.get("/events/:eventId", showSingleEvent);
router.post("/events/:eventId/featureEvent", featureEvent);
router.post("/events/:eventId/unFeatureEvent", unFeatureEvent);
router.post("/events/:eventId/approveEvent", approveEvent);
router.post("/events/:eventId/rejectEvent", rejectEvent);

//categories
router.get("/categories", showCategories);
router.get("/category/:categoryId", showSingleCategory);
router.get("/categories/add", showAddCategory);
router.post("/categories/add", addCategory);
router.get("/categories/:categoryId/edit", showEditCategory);

router.patch("/users/:userId/:action", toggleBlockUser);

router.get("/dashboard", isAdmin, getDash);

export default router;
