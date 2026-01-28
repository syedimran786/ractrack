const buildStudentQuery = ({ search, batch, paid, placed, mockRating }) => {
  const query = { isDeleted: false };

  // 🔍 Search by name/email (regex-safe)
  if (search) {
    query.$or = [
      { studentName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // 🏷 Filters
  if (batch) query.batch = batch.toLowerCase();
  if (paid !== undefined) query.isPaid = paid === "true";
  if (placed !== undefined) query.isPlaced = placed === "true";

  // 🌟 Filter by mockRating
  if (mockRating) query.mockRating = mockRating.toLowerCase();

  return query;
};

module.exports = buildStudentQuery;
