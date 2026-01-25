import { bookmarksToggler, userBookmarks } from "../../service/user/bookmarksService.js";

export const toggleBookmark = async (req, res) => {
  const eventId = req.params.eventId;
  const userId = req.session.user;
  try {
    const result = await bookmarksToggler(eventId, userId);
    if (result.action == "Removed") {
      res.status(200).json({ status: true, action: result.action });
    } else {
      res.status(200).json({ status: true, action: result.action });
    }
  } catch (error) {
    console.error("Error in bookmarksController", error);
    res.status(500).json({ status: false, message: "Failed to update bookmark" });
  }
};

export const bookmarks = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/dashboard");
  }
  const bms = await userBookmarks(req.session.user);
  res.render("user/bookmarks", { bms: bms.events });
};
