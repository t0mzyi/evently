import orderDb from "../../model/ordersDb.js";
import userDb from "../../model/userDb.js";
import eventsDb from "../../model/eventsDb.js";
import couponDb from "../../model/couponsDb.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit-table";

const buildDateFilter = (filters) => {
  const { startDate, endDate } = filters;

  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T23:59:59.999Z");

  return {
    createdAt: { $gte: start, $lte: end },
    status: "CONFIRMED",
  };
};

export const getSalesReport = async (filters) => {
  const match = buildDateFilter(filters);

  const stats = await orderDb.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$pricing.totalAmount" },
        totalFees: { $sum: "$pricing.serviceFee" },
        totalDiscount: { $sum: "$pricing.discountAmount" },
        orders: { $sum: 1 },
        tickets: { $sum: "$selectedTicket.quantity" },
      },
    },
  ]);

  const detailedOrders = await orderDb
    .find(match)
    .populate("eventId", "title hostId")
    .populate("userId", "firstName lastName emailAddress")
    .sort({ createdAt: -1 })
    .lean();

  const transactionDetails = await Promise.all(
    detailedOrders.map(async (order) => {
      let couponDetails = null;
      if (order.pricing.couponCode) {
        couponDetails = await couponDb.findOne({ code: order.pricing.couponCode }).lean();
      }

      return {
        orderId: order._id,
        buyerName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : "Guest",
        buyerEmail: order.userId?.emailAddress || "N/A",
        eventName: order.eventId?.title || "Unknown Event",
        ticketName: order.selectedTicket?.name || "N/A",
        quantity: order.selectedTicket?.quantity || 0,
        subtotal: order.pricing.subTotal || 0,
        discountAmount: order.pricing.discountAmount || 0,
        couponCode: order.pricing.couponCode || "None",
        couponType: couponDetails?.type || "N/A",
        serviceFee: order.pricing.serviceFee || 0,
        totalAmount: order.pricing.totalAmount || 0,
        paymentMethod: order.paymentIntentId ? "Razorpay" : "Wallet",
        purchasedAt: order.createdAt,
        status: order.status,
      };
    }),
  );

  return {
    summary: stats[0] || {
      totalRevenue: 0,
      totalFees: 0,
      totalDiscount: 0,
      orders: 0,
      tickets: 0,
    },
    transactionDetails,
  };
};

export const exportReportToCSV = async (reportData) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sales Report");

  sheet.columns = [
    { header: "Order ID", key: "orderId", width: 25 },
    { header: "Buyer Name", key: "buyerName", width: 20 },
    { header: "Buyer Email", key: "buyerEmail", width: 25 },
    { header: "Event", key: "eventName", width: 30 },
    { header: "Ticket Type", key: "ticketName", width: 20 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Subtotal (₹)", key: "subtotal", width: 15 },
    { header: "Discount (₹)", key: "discountAmount", width: 15 },
    { header: "Coupon Code", key: "couponCode", width: 15 },
    { header: "Coupon Type", key: "couponType", width: 15 },
    { header: "Service Fee (₹)", key: "serviceFee", width: 15 },
    { header: "Total (₹)", key: "totalAmount", width: 15 },
    { header: "Payment Method", key: "paymentMethod", width: 15 },
    { header: "Purchase Date", key: "purchasedAt", width: 20 },
    { header: "Status", key: "status", width: 15 },
  ];

  reportData.transactionDetails.forEach((tx) => {
    sheet.addRow({
      orderId: tx.orderId.toString(),
      buyerName: tx.buyerName,
      buyerEmail: tx.buyerEmail,
      eventName: tx.eventName,
      ticketName: tx.ticketName,
      quantity: tx.quantity,
      subtotal: tx.subtotal.toFixed(2),
      discountAmount: tx.discountAmount.toFixed(2),
      couponCode: tx.couponCode,
      couponType: tx.couponType,
      serviceFee: tx.serviceFee.toFixed(2),
      totalAmount: tx.totalAmount.toFixed(2),
      paymentMethod: tx.paymentMethod,
      purchasedAt: new Date(tx.purchasedAt).toLocaleString(),
      status: tx.status,
    });
  });

  return await workbook.xlsx.writeBuffer();
};

export const exportReportToPDF = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const PAGE_WIDTH = 842;
      const PAGE_HEIGHT = 595;
      const MARGIN = 40;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

      const doc = new PDFDocument({
        margin: MARGIN,
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        orientation: "landscape",
      });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const summary = reportData?.summary || {
        totalRevenue: 0,
        totalFees: 0,
        totalDiscount: 0,
        tickets: 0,
        orders: 0,
      };
      const transactions = Array.isArray(reportData?.transactionDetails) ? reportData.transactionDetails : [];

      // Title
      doc.fontSize(20).font("Helvetica-Bold").text("Sales Performance Report", {
        align: "center",
        underline: true,
      });
      doc.moveDown(0.5);

      // Date range info
      const presetLabels = {
        today: "Today",
        yesterday: "Yesterday",
        thisWeek: "This Week",
        lastWeek: "Last Week",
        thisMonth: "This Month",
        lastMonth: "Last Month",
        thisQuarter: "This Quarter",
        lastQuarter: "Last Quarter",
        thisYear: "This Year",
        lastYear: "Last Year",
        monthly: "Monthly",
        yearly: "Yearly",
        custom: "Custom Range",
      };

      const periodLabel = presetLabels[reportData.datePreset] || "Custom Range";

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Period: ${periodLabel} (${reportData.startDate || "N/A"} to ${reportData.endDate || "N/A"})`,
          { align: "center" },
        );
      doc.moveDown(1);

      let currentY = doc.y;
      doc.fontSize(12).font("Helvetica-Bold").text("Summary", MARGIN, currentY);
      currentY += 20;

      const summaryItems = [
        { label: "Total Revenue", value: `₹${(summary.totalRevenue || 0).toFixed(2)}` },
        { label: "Platform Fees", value: `₹${(summary.totalFees || 0).toFixed(2)}` },
        { label: "Total Discounts", value: `₹${(summary.totalDiscount || 0).toFixed(2)}` },
        { label: "Tickets Sold", value: summary.tickets || 0 },
        { label: "Total Orders", value: summary.orders || 0 },
      ];

      const summaryColWidth = CONTENT_WIDTH / 5;
      summaryItems.forEach((item, idx) => {
        const x = MARGIN + idx * summaryColWidth;
        doc.fontSize(8).font("Helvetica").text(item.label, x, currentY);
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(item.value, x, currentY + 12);
      });

      currentY += 50;

      doc.fontSize(12).font("Helvetica-Bold").text("Transaction Details", MARGIN, currentY);
      currentY += 20;

      const columns = [
        { header: "Order ID", key: "orderId", width: 85 },
        { header: "Buyer", key: "buyerName", width: 120 },
        { header: "Event", key: "eventName", width: 160 },
        { header: "Ticket", key: "ticketName", width: 130 },
        { header: "Qty", key: "quantity", width: 45 },
        { header: "Total", key: "totalAmount", width: 80 },
        { header: "Date", key: "purchasedAt", width: 90 },
      ];

      const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
      const tableStartX = MARGIN + (CONTENT_WIDTH - tableWidth) / 2;

      doc.fontSize(9).font("Helvetica-Bold");
      doc.rect(tableStartX, currentY, tableWidth, 22).fill("#1C2A3A");

      let colX = tableStartX;
      columns.forEach((col) => {
        doc.fillColor("#FFFFFF").text(col.header, colX + 4, currentY + 6, {
          width: col.width - 8,
          align: "left",
          continued: false,
        });
        colX += col.width;
      });
      doc.stroke();

      doc.fillColor("#000000");
      currentY += 22;

      doc.fontSize(8).font("Helvetica");
      let rowIndex = 0;

      transactions.forEach((tx) => {
        if (currentY > PAGE_HEIGHT - MARGIN - 30) {
          doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: MARGIN });
          currentY = MARGIN;
        }

        if (rowIndex % 2 === 0) {
          doc.fillColor("#F0F0F0").rect(tableStartX, currentY, tableWidth, 18).fill();
        }
        doc.strokeColor("#000000").rect(tableStartX, currentY, tableWidth, 18).stroke();

        colX = tableStartX;
        columns.forEach((col) => {
          let cellValue = "";
          switch (col.key) {
            case "orderId":
              cellValue = tx.orderId?.toString().slice(-8).toUpperCase() || "N/A";
              break;
            case "buyerName":
              cellValue = tx.buyerName?.substring(0, 18) || "N/A";
              break;
            case "eventName":
              cellValue = tx.eventName?.substring(0, 22) || "N/A";
              break;
            case "ticketName":
              cellValue = tx.ticketName?.substring(0, 18) || "N/A";
              break;
            case "quantity":
              cellValue = (tx.quantity || 0).toString();
              break;
            case "totalAmount":
              cellValue = `₹${(tx.totalAmount || 0).toFixed(2)}`;
              break;
            case "purchasedAt":
              cellValue = tx.purchasedAt ? new Date(tx.purchasedAt).toLocaleDateString() : "N/A";
              break;
          }

          doc.fillColor("#000000").text(cellValue, colX + 4, currentY + 4, {
            width: col.width - 8,
            align: col.key === "quantity" ? "center" : "left",
            continued: false,
          });
          colX += col.width;
        });

        currentY += 18;
        rowIndex++;
      });

      if (transactions.length === 0) {
        doc
          .fontSize(9)
          .font("Helvetica-Oblique")
          .text("No transactions found for this period", tableStartX, currentY + 10);
      }

      doc.end();
    } catch (error) {
      console.error("PDF Generation Error:", error);
      reject(error);
    }
  });
};
