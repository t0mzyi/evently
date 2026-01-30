import crypto from "crypto";

export const generateBookingId = () => {
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `TICK-${randomPart}`;
};
