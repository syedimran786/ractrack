const Student = require("../models/student.model");
const Company = require("../models/company.model");
const Placement = require("../models/placement.model");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* ======================================================
   1️⃣ ADD COMPANY (SCHEDULE INTERVIEW)
====================================================== */
const addCompanyToStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { companyId, interviewId, interviewDate } = req.body;

  if (!companyId || !interviewId) {
    throw new ApiError(400, "companyId and interviewId are required");
  }

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "Student not found");

  const company = await Company.findById(companyId);
  if (!company) throw new ApiError(404, "Company not found");

  const exists = student.companiesAdded.find(
    (c) =>
      c.companyId.toString() === companyId &&
      c.interviewId.toString() === interviewId
  );

  if (exists) throw new ApiError(409, "Company already scheduled");

  student.companiesAdded.push({
    companyId,
    interviewId,
    interviewDate,
    status: "scheduled",
  });

  await student.save();

  res.json(new ApiResponse(200, student, "Interview scheduled"));
});

/* ======================================================
   2️⃣ MARK AS ATTENDED
====================================================== */
const markAsAttended = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { companyId, interviewId } = req.body;

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "Student not found");

  const index = student.companiesAdded.findIndex(
    (c) =>
      c.companyId.toString() === companyId &&
      c.interviewId.toString() === interviewId
  );

  if (index === -1) {
    throw new ApiError(404, "Interview not found in scheduled list");
  }

  const interview = student.companiesAdded[index];

  // remove from scheduled
  student.companiesAdded.splice(index, 1);

  // add to attended (clean object)
  student.companiesAttended.push({
    companyId: interview.companyId,
    interviewId: interview.interviewId,
    interviewDate: interview.interviewDate,
    status: "attended",
  });

  await student.save();

  res.json(new ApiResponse(200, student, "Marked as attended"));
});

/* ======================================================
   3️⃣ UPDATE INTERVIEW STATUS (SELECTED / REJECTED)
====================================================== */
const updateInterviewStatus = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { companyId, interviewId, status } = req.body;

  if (!["selected", "rejected"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "Student not found");

  const interview = student.companiesAttended.find(
    (c) =>
      c.companyId.toString() === companyId &&
      c.interviewId.toString() === interviewId
  );

  if (!interview) throw new ApiError(404, "Interview not found");

  // prevent multiple placements
  if (status === "selected" && student.isPlaced) {
    throw new ApiError(400, "Student already placed");
  }

  interview.status = status;

  // optional: auto mark placed (soft state only)
  if (status === "selected") {
    student.isPlaced = true;
    student.placedCompany = companyId;
  }

  await student.save();

  res.json(new ApiResponse(200, student, "Interview status updated"));
});

/* ======================================================
   4️⃣ FINAL PLACEMENT UPDATE (TRANSACTION SAFE)
====================================================== */
const updatePlacementByHR = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { id } = req.params;

      const {
        companiesAttended,
        isPlaced,
        placedCompany,
        mockRating,
        companyDesignation,
      } = req.body;

      const student = await Student.findOne(
        { _id: id, isDeleted: false },
        null,
        { session }
      );

      if (!student) throw new ApiError(404, "Student not found");

      /* ===============================
         UPDATE companiesAttended (optional override)
      =============================== */
      if (companiesAttended !== undefined) {
        if (!Array.isArray(companiesAttended)) {
          throw new ApiError(400, "companiesAttended must be an array");
        }

        student.companiesAttended = companiesAttended;
      }

      /* ===============================
         UPDATE mockRating
      =============================== */
      if (mockRating !== undefined) {
        const allowed = [
          "excellent",
          "good",
          "average",
          "poor",
          "very poor",
        ];

        const normalized = mockRating.toLowerCase().trim();

        if (!allowed.includes(normalized)) {
          throw new ApiError(400, "Invalid mock rating");
        }

        student.mockRating = normalized;
      }

      /* ===============================
         PLACEMENT LOGIC
      =============================== */
      if (typeof isPlaced === "boolean") {
        if (isPlaced) {
          if (!placedCompany) {
            throw new ApiError(400, "placedCompany required");
          }

          const company = await Company.findById(placedCompany).session(session);
          if (!company) throw new ApiError(404, "Company not found");

          if (!student.isPlaced) {
            // CREATE
            await Placement.create(
              [
                {
                  studentId: student._id,
                  companyId: company._id,
                  fullName: student.studentName,
                  ugStream: student.ugStream,
                  studentEmail: student.email,
                  studentMobile: student.mobile,
                  studentImage: student.photoUrl,
                  companyName: company.companyName,
                  companyImageUrl: company.companyImageUrl,
                  companyDesignation,
                },
              ],
              { session }
            );

            student.isPlaced = true;
            student.placedCompany = company._id;
          } else {
            // UPDATE
            const placement = await Placement.findOne(
              { studentId: student._id, isDeleted: false },
              null,
              { session }
            );

            if (!placement) throw new ApiError(404, "Placement not found");

            placement.companyId = company._id;
            placement.companyName = company.companyName;
            placement.companyImageUrl = company.companyImageUrl;

            if (companyDesignation !== undefined) {
              placement.companyDesignation = companyDesignation;
            }

            await placement.save({ session });

            student.placedCompany = company._id;
          }
        } else {
          // REMOVE
          await Placement.findOneAndUpdate(
            { studentId: student._id, isDeleted: false },
            { isDeleted: true, deletedAt: new Date() },
            { session }
          );

          student.isPlaced = false;
          student.placedCompany = null;
        }
      }

      /* ===============================
         ONLY DESIGNATION UPDATE
      =============================== */
      if (
        companyDesignation !== undefined &&
        student.isPlaced &&
        isPlaced === undefined
      ) {
        const placement = await Placement.findOne(
          { studentId: student._id, isDeleted: false },
          null,
          { session }
        );

        if (!placement) throw new ApiError(404, "Placement not found");

        placement.companyDesignation = companyDesignation;
        await placement.save({ session });
      }

      await student.save({ session });
    });

    res.json(
      new ApiResponse(200, null, "Placement updated successfully")
    );
  } finally {
    session.endSession();
  }
});

/* ======================================================
   EXPORTS
====================================================== */
module.exports = {
  addCompanyToStudent,
  markAsAttended,
  updateInterviewStatus,
  updatePlacementByHR,
};