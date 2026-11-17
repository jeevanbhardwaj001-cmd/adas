const CONFIG = {
  recipients: ["vinay.kandpal@novushitech.com", "jeevan.kumar@novushitech.com", "marketing@novushitech.com"],
  spreadsheetId: "1pqiW19MyfdTzv5bIShuRd-5wmPMpX3zuNUcZZ1f1NJk",
  sheetName: "Leads",
  fleetSafetySheetName: "Fleet Safety Leads",
};

const HEADERS = [
  "Received at",
  "Subject",
  "Name",
  "Company",
  "Email",
  "Phone",
  "Material to move",
  "Heaviest load",
  "Trips per shift",
  "Shifts",
  "Region",
  "City",
  "Target timeline",
  "Budget status",
  "Decision role",
  "Recommended robot",
  "Fleet size",
];

const FLEET_SAFETY_HEADERS = [
  "Received at",
  "Submission type",
  "Name",
  "Company",
  "Email",
  "Phone",
  "Fleet size",
];

function doPost(event) {
  try {
    const data = event && event.parameter ? event.parameter : {};

    if (data.website) {
      return jsonResponse({ ok: true });
    }

    const isQuiz = Boolean(
      data.material ||
      data.loadWeight ||
      data.tripsPerShift ||
      data.recommendedRobot
    );
    const useFleetSafetySheet = !isQuiz && data.landingPage === "fleet-safety";
    const submissionType = isQuiz
      ? "Estimate quiz"
      : useFleetSafetySheet
        ? "Fleet Safety Landing Page"
        : "Google Ads Enquiry for Fleet Safety";
    const email = String(data.email || data.lead_email || "").trim();

    if ((!isQuiz && !email) || (email && !isValidEmail(email))) {
      return jsonResponse({ ok: false, message: "A valid email address is required." });
    }

    const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
    if (!spreadsheet) {
      throw new Error("The configured leads spreadsheet could not be opened.");
    }

    const sheetName = useFleetSafetySheet ? CONFIG.fleetSafetySheetName : CONFIG.sheetName;
    const headers = useFleetSafetySheet ? FLEET_SAFETY_HEADERS : HEADERS;
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    } else if (!useFleetSafetySheet && sheet.getRange(1, 2).getValue() === "Submission type") {
      sheet.getRange(1, 2).setValue("Subject");
    }
    if (!useFleetSafetySheet && sheet.getLastColumn() < HEADERS.length) {
      sheet.getRange(1, HEADERS.length).setValue(HEADERS[HEADERS.length - 1]);
    }

    const row = useFleetSafetySheet
      ? [
          new Date(),
          submissionType,
          safeCell(data.name || data.lead_name),
          safeCell(data.company || data.lead_company),
          safeCell(email),
          safeCell(data.phone || data.lead_phone),
          safeCell(data.fleetSize),
        ]
      : [
          new Date(),
          submissionType,
          safeCell(data.name || data.lead_name),
          safeCell(data.company || data.lead_company),
          safeCell(email),
          safeCell(data.phone || data.lead_phone),
          safeCell(data.material),
          safeCell(data.loadWeight),
          safeCell(data.tripsPerShift),
          safeCell(data.shifts),
          safeCell(data.region),
          safeCell(data.city),
          safeCell(data.timeline),
          safeCell(data.budget),
          safeCell(data.decisionRole),
          safeCell(data.recommendedRobot),
          safeCell(data.fleetSize),
        ];

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    const subject = isQuiz
      ? "Fleet Safety estimate quiz"
      : useFleetSafetySheet
        ? "Fleet Safety Landing Page enquiry"
        : "Google Ads Enquiry for Fleet Safety";

    try {
      MailApp.sendEmail({
        to: CONFIG.recipients.join(","),
        subject: subject,
        body: createEmailBody(subject, data, email),
      });
      return jsonResponse({ ok: true, emailSent: true });
    } catch (emailError) {
      console.error("Submission saved, but the notification email failed.", emailError);
      return jsonResponse({
        ok: true,
        emailSent: false,
        message: "Your submission was saved, but the email notification could not be sent.",
      });
    }
  } catch (error) {
    console.error("Could not process website submission.", error);
    return jsonResponse({
      ok: false,
      message: "The submission could not be processed. Please try again.",
    });
  }
}

function createEmailBody(subject, data, email) {
  const fields = [
    ["Subject", subject],
    ["Name", data.name || data.lead_name],
    ["Company", data.company || data.lead_company],
    ["Email", email],
    ["Phone", data.phone || data.lead_phone],
    ["Material to move", data.material],
    ["Heaviest load", data.loadWeight],
    ["Trips per shift", data.tripsPerShift],
    ["Shifts", data.shifts],
    ["Region", data.region],
    ["City", data.city],
    ["Target timeline", data.timeline],
    ["Budget status", data.budget],
    ["Decision role", data.decisionRole],
    ["Recommended robot", data.recommendedRobot],
    ["Fleet size", data.fleetSize],
  ];

  return fields
    .filter(([, value]) => value)
    .map(([label, value]) => label + ": " + value)
    .join("\n");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeCell(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
