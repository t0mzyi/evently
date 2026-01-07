import express from "express";
import { AloginGet, AloginPost } from "../controller/admin/Alogin.js";
import {
  getDash,
  singleUser,
  toggleBlockUser,
  users,
} from "../controller/admin/AdashController.js";
const router = express.Router();

router.get("/", (req, res) => res.redirect("/admin/login"));
router.get("/login", AloginGet);
router.post("/login", AloginPost);

router.get("/users", users);
router.get("/users/:userId", singleUser);

router.patch("/users/:userId/:action", toggleBlockUser);

router.get("/dash", getDash);

export default router;
