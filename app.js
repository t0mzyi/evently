import "./config/env.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import { connectDb } from "./config/dbConnect.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import passport from "passport";

//db
import "./model/categoryDb.js";
import "./model/eventsDb.js";

import "./jobs/unfeatureEvents.js";

//dependies
import userRouter from "./routes/userRoutes.js";
import adminRouter from "./routes/adminRoutes.js";

const app = express();
import "./config/passport.js";
import userDb from "./model/userDb.js";
app.use(
  session({
    secret: "Ca32e322321231232",
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  req.session.user = "79607a76389f2bdb6c08d745";
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await userDb.findById(req.session.user);
      res.locals.user = user;
    } catch (err) {
      console.error(err);
    }
  } else {
    res.locals.user = null;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", userRouter);
app.use("/admin", adminRouter);

app.use((req, res) => {
  res.status(404).render("404");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).render("404");
});
await connectDb();
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
