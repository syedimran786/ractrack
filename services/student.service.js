const Student = require("../models/student.model");
const ApiError = require("../utils/ApiError");
const buildStudentQuery = require("../utils/buildStudentQuery");

/* CREATE */
const createStudentService = async (data) => {
  const exists = await Student.findOne({ email: data.email });
  if (exists) throw new ApiError(409, "Email already exists");

  return Student.create(data);
};

/* GET WITH PAGINATION + FILTERS */
const getStudentsService = async (queryParams) => {
  const page = Number(queryParams.page) || 1;
  const limit = Number(queryParams.limit) || 10;
  const skip = (page - 1) * limit;

  const query = buildStudentQuery(queryParams);

  const [students, total, counts] = await Promise.all([
    Student.find(query)
      .select("-photoHash -photoId")
      .skip(skip)
      .limit(limit)
      .lean(),

    Student.countDocuments(query),

    Student.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$isPlaced",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const placedCount =
    counts.find((c) => c._id === true)?.count || 0;
  const notPlacedCount =
    counts.find((c) => c._id === false)?.count || 0;

  return {
    students,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      placed: placedCount,
      notPlaced: notPlacedCount,
    },
  };
};

module.exports = {
  createStudentService,
  getStudentsService,
};
