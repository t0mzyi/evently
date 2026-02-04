import { calenderRender } from "../../service/user/calenderService.js";

export const showCalender = async (req, res) => {
  const eventToShow = await calenderRender(req.session.user);
  res.render("user/dash/calendar", { eventToShow });
};
