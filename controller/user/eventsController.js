//user

import { allEvents, singleEventFinder } from "../../service/user/eventsService.js";

import { formatDate } from "../../utils/dateTimeFormator.js";
// {
//   _id: ObjectId('6968ab32497f46062263b117'),
//   hostId: '79607a76389f2bdb6c08d741',
//   title: 'Sunset Jazz Night',
//   description: 'Live jazz performance with local artists and cocktails.',
//   categoryId: '6968a997497f46062263b112',
//   startDate: ISODate('2025-03-10T18:00:00.000Z'),
//   venueType: 'iconic',
//   venueId: '695f5b61f1f90b0ad8171132',
//   galleryImages: [
//     'https://images.unsplash.com/photo-1511379938547-c1f69419868d',
//     'https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2'
//   ],
//   status: 'approved',
//   isFree: false,
//   maxCapacity: 150,
//   ticketTypes: [
//     {
//       name: 'Regular',
//       price: 25,
//       quantityTotal: 100,
//       quantityAvailable: 100
//     },
//     {
//       name: 'VIP',
//       price: 60,
//       quantityTotal: 50,
//       quantityAvailable: 50
//     }
//   ]
// }

export const showAllEvents = async (req, res) => {
  const events = await allEvents();
  res.render("user/events/events", { events });
};

export const showSingleEvent = async (req, res) => {
  let eventId = req.params.eventId;
  const { event, venue, ...ticket } = await singleEventFinder(eventId);

  const schedule = formatDate(event.startDate);
  res.render("user/events/event-details", { event, venue, schedule, ticket });
};
