import * as reportsService from "../../service/admin/reportsService.js";

const getDateRangeFromPreset = (preset, month, year) => {
  const today = new Date();
  let startDate, endDate;

  switch (preset) {
    case "today":
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      break;

    case "yesterday":
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59, 999);
      break;

    case "thisWeek":
      const currentDay = today.getDay();
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      startDate = new Date(today.setDate(diff));
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 23, 59, 59, 999);
      break;

    case "lastWeek":
      const lastWeekDay = today.getDay();
      const lastWeekDiff = today.getDate() - lastWeekDay - 6;
      startDate = new Date(today.setDate(lastWeekDiff));
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 23, 59, 59, 999);
      break;

    case "thisMonth":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "lastMonth":
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;

    case "thisQuarter":
      const currentQuarter = Math.floor(today.getMonth() / 3);
      startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
      endDate = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
      break;

    case "lastQuarter":
      const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
      const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
      const lastQuarterNum = lastQuarter < 0 ? 3 : lastQuarter;
      startDate = new Date(lastQuarterYear, lastQuarterNum * 3, 1);
      endDate = new Date(lastQuarterYear, (lastQuarterNum + 1) * 3, 0, 23, 59, 59, 999);
      break;

    case "thisYear":
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case "lastYear":
      startDate = new Date(today.getFullYear() - 1, 0, 1);
      endDate = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;

    case "monthly":
      const selectedMonth = parseInt(month);
      const selectedYear = parseInt(year) || today.getFullYear();
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      break;

    case "yearly":
      const selectedYear2 = parseInt(year) || today.getFullYear();
      startDate = new Date(selectedYear2, 0, 1);
      endDate = new Date(selectedYear2, 11, 31, 23, 59, 59, 999);
      break;

    case "custom":
    default:
      startDate = new Date(req.query.startDate || new Date(today.getFullYear(), today.getMonth(), 1));
      endDate = new Date(req.query.endDate || today);
      break;
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};

export const showSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, datePreset, month, year } = req.query;

    let filters;
    if (datePreset && datePreset !== "custom") {
      const dateRange = getDateRangeFromPreset(datePreset, month, year);
      filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        datePreset,
        month,
        year,
      };
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultEndDate.getDate() - 30);

      filters = {
        startDate: startDate || defaultStartDate.toISOString().split("T")[0],
        endDate: endDate || defaultEndDate.toISOString().split("T")[0],
        datePreset: "custom",
        month,
        year,
      };
    }

    const salesReport = await reportsService.getSalesReport(filters);

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

export const downloadReportCSV = async (req, res) => {
  try {
    const { startDate, endDate, datePreset, month, year } = req.query;

    let filters;
    if (datePreset && datePreset !== "custom") {
      const dateRange = getDateRangeFromPreset(datePreset, month, year);
      filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        datePreset,
        month,
        year,
      };
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultEndDate.getDate() - 30);

      filters = {
        startDate: startDate || defaultStartDate.toISOString().split("T")[0],
        endDate: endDate || defaultEndDate.toISOString().split("T")[0],
        datePreset: "custom",
        month,
        year,
      };
    }

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

export const downloadReportPDF = async (req, res) => {
  try {
    const { startDate, endDate, datePreset, month, year } = req.query;

    let filters;
    if (datePreset && datePreset !== "custom") {
      const dateRange = getDateRangeFromPreset(datePreset, month, year);
      filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        datePreset,
        month,
        year,
      };
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultEndDate.getDate() - 30);

      filters = {
        startDate: startDate || defaultStartDate.toISOString().split("T")[0],
        endDate: endDate || defaultEndDate.toISOString().split("T")[0],
        datePreset: "custom",
        month,
        year,
      };
    }

    const reportData = await reportsService.getSalesReport(filters);
    reportData.startDate = filters.startDate;
    reportData.endDate = filters.endDate;
    reportData.datePreset = filters.datePreset;

    const buffer = await reportsService.exportReportToPDF(reportData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Sales_Report_${Date.now()}.pdf`);
    res.send(buffer);
  } catch (error) {
    console.error("PDF Export Error:", error);
    res.status(500).send("Export failed");
  }
};
