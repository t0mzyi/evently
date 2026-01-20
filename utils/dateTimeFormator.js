export const formatDate = (isoDate) => {
  const ISOdate = new Date(isoDate);
  const date = ISOdate.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const time = ISOdate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return { date, time };
};
