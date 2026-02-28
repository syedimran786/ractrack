const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Student = require("../models/student.model");
const Company = require("../models/company.model");
const HRInterview = require("../models/hrInterview.model");
const ApiError = require("../utils/ApiError");

/* =========================
   GET ELIGIBLE STUDENTS
========================= */
const getEligibleStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({
    isActive: true,
    isPlaced: false,
  }).select("studentName email mobile companiesAttended");

  res.status(200).json({
    success: true,
    count: students.length,
    data: students,
  });
});

/* =========================
   ASSIGN COMPANY TO STUDENT
========================= */
const assignCompanyToStudent = asyncHandler(async (req, res) => {
  const { studentId, companyId, interviewDate } = req.body;

  if (!studentId || !companyId || !interviewDate) {
    throw new ApiError(400, "All fields are required");
  }

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "Student not found");

  if (student.isPlaced) {
    throw new ApiError(400, "Student already placed");
  }

  const company = await Company.findById(companyId);
  if (!company) throw new ApiError(404, "Company not found");

  const alreadyAssigned = student.companiesAttended.some(
    (c) => c.companyId.toString() === companyId
  );

  if (alreadyAssigned) {
    throw new ApiError(400, "Company already assigned to this student");
  }

  const interview = await HRInterview.create({
    hrId: req.user._id,
    studentId,
    companyId,
    interviewDate,
    status: "scheduled",
  });

  student.companiesAttended.push({
    companyId,
    interviewId: interview._id,
    interviewDate,
    status: "scheduled",
  });

  await student.save();

  res.status(201).json({
    success: true,
    message: "Company assigned successfully",
    interview,
  });
});

/* =========================
   UPDATE INTERVIEW STATUS
========================= */
const updateInterviewStatus = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { status, feedback } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const interview = await HRInterview.findById(interviewId);
  if (!interview) throw new ApiError(404, "Interview not found");

  interview.status = status;
  if (feedback) interview.feedback = feedback;
  await interview.save();

  const student = await Student.findById(interview.studentId);
  if (!student) throw new ApiError(404, "Student not found");

  const attendedCompany = student.companiesAttended.find(
    (c) => c.interviewId.toString() === interviewId
  );

  if (attendedCompany) {
    attendedCompany.status = status;
  }

  if (status === "selected") {
    student.isPlaced = true;
    student.placedCompany = interview.companyId;
  }

  await student.save();

  res.status(200).json({
    success: true,
    message: "Interview status updated successfully",
  });
});

/* =========================
   GET HR INTERVIEWS
========================= */
const getHRInterviews = asyncHandler(async (req, res) => {
  const interviews = await HRInterview.find({ hrId: req.user._id })
    .populate("studentId", "studentName email mobile")
    .populate("companyId", "companyName")
    .sort({ interviewDate: -1 });

  res.status(200).json({
    success: true,
    count: interviews.length,
    data: interviews,
  });
});

/* =========================
   UPCOMING INTERVIEWS (7 DAYS)
========================= */
const getUpcomingInterviews = asyncHandler(async (req, res) => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const interviews = await HRInterview.find({
    interviewDate: { $gte: today, $lte: nextWeek },
    status: "scheduled",
  })
    .populate("studentId", "studentName email mobile")
    .populate("companyId", "companyName")
    .sort({ interviewDate: 1 });

  res.status(200).json({
    success: true,
    count: interviews.length,
    data: interviews,
  });
});

/* =========================
   STUDENT INTERVIEW TIMELINE
========================= */
const getStudentInterviewTimeline = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new ApiError(400, "Invalid student id");
  }

  const timeline = await Student.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(studentId) } },
    { $unwind: "$companiesAttended" },
    {
      $lookup: {
        from: "hrinterviews",
        localField: "companiesAttended.interviewId",
        foreignField: "_id",
        as: "interview",
      },
    },
    { $unwind: "$interview" },
    {
      $lookup: {
        from: "companies",
        localField: "companiesAttended.companyId",
        foreignField: "_id",
        as: "company",
      },
    },
    { $unwind: "$company" },
    {
      $project: {
        _id: 0,
        companyName: "$company.companyName",
        interviewDate: "$companiesAttended.interviewDate",
        status: "$companiesAttended.status",
        feedback: "$interview.feedback",
        createdAt: "$interview.createdAt",
      },
    },
    { $sort: { interviewDate: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: timeline,
  });
});

/* =========================
   EXPORTS
========================= */
module.exports = {
  getEligibleStudents,
  assignCompanyToStudent,
  updateInterviewStatus,
  getHRInterviews,
  getUpcomingInterviews,
  getStudentInterviewTimeline,
};
