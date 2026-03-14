import * as reportsService from "../../service/admin/reportsService.js";

// --- MAIN SALES REPORT ROUTE ---
export const showSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Set default date range (last 30 days) if not provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultEndDate.getDate() - 30);

    const filters = {
      startDate: startDate || defaultStartDate.toISOString().split("T")[0],
      endDate: endDate || defaultEndDate.toISOString().split("T")[0],
    };

    // Fetch report data from service
    const salesReport = await reportsService.getSalesReport(filters);

    // Render the view with data
    res.render("admin/reports/sales", {
      activePage: "reports",
      salesData: salesReport.summary,
      transactionDetails: salesReport.transactionDetails,
      filters: filters,
    });
  } catch (error) {
    console.error("Sales Report Error:", error);
    res.status(500).render("404", {
      message: "Failed to load sales report",
    });
  }
};

// --- CSV EXPORT ---
export const downloadReportCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultEndDate.getDate() - 30);

    const filters = {
      startDate: startDate || defaultStartDate.toISOString().split("T")[0],
      endDate: endDate || defaultEndDate.toISOString().split("T")[0],
    };

    const reportData = await reportsService.getSalesReport(filters);
    const buffer = await reportsService.exportReportToCSV(reportData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=Sales_Report_${Date.now()}.csv`);
    res.send(buffer);
  } catch (error) {
    console.error("CSV Export Error:", error);
    res.status(500).send("Export failed");
  }
};

// --- PDF EXPORT ---
export const downloadReportPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultEndDate.getDate() - 30);

    const filters = {
      startDate: startDate || defaultStartDate.toISOString().split("T")[0],
      endDate: endDate || defaultEndDate.toISOString().split("T")[0],
    };

    const reportData = await reportsService.getSalesReport(filters);
    reportData.startDate = filters.startDate;
    reportData.endDate = filters.endDate;

    const buffer = await reportsService.exportReportToPDF(reportData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Sales_Report_${Date.now()}.pdf`);
    res.send(buffer);
  } catch (error) {
    console.error("PDF Export Error:", error);
    res.status(500).send("Export failed");
  }
};
