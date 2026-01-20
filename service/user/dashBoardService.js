import userDb from "../../model/userDb.js";

export const updateProfileService = async (updateData, userId) => {
  try {
    return await userDb.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
  } catch (err) {
    throw new Error("error in updateProfileService", err.message);
  }
};

export const userFinder = async (userId) => {
  if (!userId) {
    throw new Error("Session expired");
  }
  const user = await userDb.findById(userId);
  return user;
};
