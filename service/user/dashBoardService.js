import eventsDb from "../../model/eventsDb.js";
import ticketDb from "../../model/ticketDb.js";
import userDb from "../../model/userDb.js";
import venueDb from "../../model/venueDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";

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

  let user = await userDb.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.isHost) {
    user = await userDb.findById(userId).populate("hostedEvents");

    // Format event dates
    user.hostedEvents.forEach((e) => {
      e.formattedDate = formatDate(e.startDate);
    });

    // Populate venue details for iconic events
    const iconicEvents = user.hostedEvents.filter((e) => e.venueType === "iconic");
    if (iconicEvents.length > 0) {
      const venuePromises = iconicEvents.map((event) => venueDb.findById(event.venueId).lean());
      const venues = await Promise.all(venuePromises);
      iconicEvents.forEach((event, index) => {
        event.venueDetails = venues[index] || null;
      });
    }

    // Calculate tickets and REAL revenue from ticketDb for each event
    for (const event of user.hostedEvents) {
      // Find all VALID (non-cancelled) tickets for this event
      const eventTickets = await ticketDb
        .find({
          eventId: event._id,
          status: { $ne: "CANCELLED" }, // Exclude cancelled tickets
        })
        .lean();

      const total = event.ticketTypes.reduce((acc, t) => acc + t.quantityTotal, 0);
      const remaining = event.ticketTypes.reduce((acc, t) => acc + t.quantityAvailable, 0);
      const sold = eventTickets.length; // Actual sold tickets from DB

      // Calculate REAL revenue: sum of (purchasePrice / 1.025) for each ticket
      const revenue = eventTickets.reduce((acc, ticket) => {
        const basePrice = ticket.purchasePrice ? ticket.purchasePrice / 1.025 : 0;
        return acc + basePrice;
      }, 0);

      event.tickets = {
        remaining,
        total,
        sold,
        revenue: Math.round(revenue * 100) / 100, // Round to 2 decimals
      };
    }
  }

  return user;
};

// Get analytics data
export const getEventAnalytics = async (
  userId,
  timeRange = "monthly",
  year = null,
  startDate = null,
  endDate = null,
) => {
  try {
    const events = await eventsDb.find({ hostId: userId }).lean();

    if (!events || events.length === 0) {
      return getEmptyAnalytics();
    }

    const eventIds = events.map((e) => e._id);
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Build date filter based on time range
    let dateFilter = {};

    if (timeRange === "daily" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Limit to 30 days max
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        end.setDate(start.getDate() + 30);
      }

      dateFilter = {
        createdAt: {
          $gte: new Date(start),
          $lte: new Date(end),
        },
      };
    } else if (timeRange === "monthly") {
      dateFilter = {
        createdAt: {
          $gte: new Date(currentYear, 0, 1),
          $lte: new Date(currentYear, 11, 31, 23, 59, 59),
        },
      };
    } else if (timeRange === "yearly") {
      dateFilter = {
        createdAt: {
          $gte: new Date(2025, 0, 1),
          $lte: new Date(2029, 11, 31, 23, 59, 59),
        },
      };
    }

    // Get all VALID (non-cancelled) tickets with date filter
    const allTickets = await ticketDb
      .find({
        eventId: { $in: eventIds },
        status: { $ne: "CANCELLED" },
        ...dateFilter,
      })
      .populate("eventId")
      .lean();

    // Calculate total revenue (excluding 2.5% service fee)
    const totalRevenue = allTickets.reduce((acc, ticket) => {
      const basePrice = ticket.purchasePrice ? ticket.purchasePrice / 1.025 : 0;
      return acc + basePrice;
    }, 0);

    // Event stats with real revenue
    const eventStats = await Promise.all(
      events.map(async (event) => {
        const eventTickets = await ticketDb
          .find({
            eventId: event._id,
            status: { $ne: "CANCELLED" },
          })
          .lean();

        const revenue = eventTickets.reduce((acc, t) => {
          const basePrice = t.purchasePrice ? t.purchasePrice / 1.025 : 0;
          return acc + basePrice;
        }, 0);

        return {
          eventId: event._id,
          title: event.title,
          ticketsSold: eventTickets.length,
          revenue: Math.round(revenue * 100) / 100,
          startDate: event.startDate,
          status: event.status,
        };
      }),
    );

    // Group revenue by time period
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueData = {};

    if (timeRange === "daily") {
      // Daily: Show each day from start to end date
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

      // Limit to 30 days
      if (daysDiff > 30) {
        end.setDate(start.getDate() + 30);
      }

      // Initialize all days in range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split("T")[0];
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        revenueData[dateKey] = {
          label,
          revenue: 0,
          sortValue: d.getTime(),
        };
      }

      // Group tickets by day
      allTickets.forEach((ticket) => {
        if (ticket.createdAt) {
          const date = new Date(ticket.createdAt);
          const dateKey = date.toISOString().split("T")[0];
          if (revenueData[dateKey]) {
            const basePrice = ticket.purchasePrice ? ticket.purchasePrice / 1.025 : 0;
            revenueData[dateKey].revenue += basePrice;
          }
        }
      });
    } else if (timeRange === "monthly") {
      // Monthly: Show all 12 months of selected year
      for (let m = 0; m < 12; m++) {
        revenueData[m] = {
          label: monthNames[m],
          revenue: 0,
          sortValue: m,
        };
      }

      // Group tickets by month
      allTickets.forEach((ticket) => {
        if (ticket.createdAt) {
          const date = new Date(ticket.createdAt);
          if (date.getFullYear() === currentYear) {
            const month = date.getMonth();
            const basePrice = ticket.purchasePrice ? ticket.purchasePrice / 1.025 : 0;
            revenueData[month].revenue += basePrice;
          }
        }
      });
    } else if (timeRange === "yearly") {
      // Yearly: Show years 2025-2029
      for (let y = 2025; y <= 2029; y++) {
        revenueData[y] = {
          label: String(y),
          revenue: 0,
          sortValue: y,
        };
      }

      // Group tickets by year
      allTickets.forEach((ticket) => {
        if (ticket.createdAt) {
          const date = new Date(ticket.createdAt);
          const year = date.getFullYear();
          if (revenueData[year]) {
            const basePrice = ticket.purchasePrice ? ticket.purchasePrice / 1.025 : 0;
            revenueData[year].revenue += basePrice;
          }
        }
      });
    }

    // Convert to sorted array
    const monthlyRevenueArray = Object.values(revenueData)
      .sort((a, b) => a.sortValue - b.sortValue)
      .map((item) => ({
        label: item.label,
        revenue: Math.round(item.revenue * 100) / 100,
      }));

    // Event status distribution
    const statusDistribution = {
      live: events.filter((e) => e.status === "live").length,
      pending: events.filter((e) => e.status === "pending").length,
      approved: events.filter((e) => e.status === "approved").length,
      completed: events.filter((e) => e.status === "completed" || e.status === "finished").length,
      rejected: events.filter((e) => e.status === "rejected").length,
    };

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalTicketsSold: allTickets.length,
      totalEvents: events.length,
      topEventByRevenue: [...eventStats].sort((a, b) => b.revenue - a.revenue)[0] || null,
      topEventByTickets: [...eventStats].sort((a, b) => b.ticketsSold - a.ticketsSold)[0] || null,
      monthlyRevenue: monthlyRevenueArray,
      statusDistribution,
      eventStats: eventStats.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
  } catch (err) {
    console.error("Error in getEventAnalytics:", err);
    return getEmptyAnalytics();
  }
};

function getEmptyAnalytics() {
  return {
    totalRevenue: 0,
    totalTicketsSold: 0,
    totalEvents: 0,
    topEventByRevenue: null,
    topEventByTickets: null,
    monthlyRevenue: [],
    statusDistribution: { live: 0, pending: 0, approved: 0, completed: 0, rejected: 0 },
    eventStats: [],
  };
}
