import categoryDb from "../../model/categoryDb.js";

export const categories = async (req, res) => {
  const categories = await categoryDb.find().populate({
    path: "events",
    select: "_id title description galleryImages startDate endDate   status ticketTypes",
    match: { status: "live" },
    options: { sort: { startDate: 1 } },
  });
  const categoriesWithPrice = categories.map((cat) => {
    const eventsWithPrice = (cat.events || []).map((event) => {
      const activeTickets = event.ticketTypes?.filter((t) => t.isActive !== false) || [];
      const minPrice = activeTickets.length > 0 ? Math.min(...activeTickets.map((t) => t.price)) : 0;

      return {
        ...event.toObject(),
        priceDisplay: minPrice === 0 ? "FREE" : `$${minPrice}`,
      };
    });

    return {
      ...cat.toObject(),
      events: eventsWithPrice,
    };
  });

  res.render("user/category/category", { categories: categoriesWithPrice });
};
