import express from "express";
import { AloginGet, AloginPost } from "../controller/admin/Alogin.js";
import {
  getDash,
  singleUser,
  toggleBlockUser,
  users,
} from "../controller/admin/AdashController.js";
import {
  addVenue,
  editVenue,
  showAddVenue,
  showEditVenue,
  showVenues,
} from "../controller/admin/AvenueController.js";
import { uploadVenue } from "../middlewares/multerUpload.js";

const router = express.Router();

router.get("/", (req, res) => res.redirect("/admin/login"));
router.get("/login", AloginGet);
router.post("/login", AloginPost);

router.get("/users", users);
router.get("/users/:userId", singleUser);

//venueSide
router.get("/venues", showVenues);
router.get("/venues/add", showAddVenue);
router.post("/venues/add", uploadVenue.array("images[]", 10), addVenue);
router.get("/venues/:venueId/edit", showEditVenue);
router.patch(
  "/venues/:venueId/edit",
  uploadVenue.array("images[]", 10),
  editVenue
);

router.patch("/users/:userId/:action", toggleBlockUser);

router.get("/dash", getDash);

export default router;
