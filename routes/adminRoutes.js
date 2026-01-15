import express from "express";
import { AloginGet, AloginPost } from "../controller/admin/login.js";
import {
  getDash,
  singleUser,
  toggleBlockUser,
  users,
} from "../controller/admin/dashController.js";
import {
  addVenue,
  editVenue,
  showAddVenue,
  showEditVenue,
  showVenues,
} from "../controller/admin/venueController.js";
import { uploadVenue } from "../middlewares/multerUpload.js";
import { ifAdmin, isAdmin } from "../middlewares/flowMiddleware.js";

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
router.patch(
  "/venues/:venueId/edit",
  uploadVenue.array("images[]", 10),
  editVenue
);

//events Side
r;

router.patch("/users/:userId/:action", toggleBlockUser);

router.get("/dash", isAdmin, getDash);

export default router;
