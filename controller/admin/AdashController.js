import { eventDetails, userDetails } from "../../service/admin/AdashService.js";

export const getDash = async (req, res) => {
  const users = await userDetails();
  const events = await eventDetails();
  res.render("admin/dash", { users, events });
};

export const users = async (req, res) => {
  const userDb = await userDetails();
  res.render("admin/users", { userDb });
};
