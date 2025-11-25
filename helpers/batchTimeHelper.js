const batchTime = t => {
  if (!/^\d{1,2}:\d{2}$/.test(t)) throw new Error("Invalid time format");

  let [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;

  return `${h}:${String(m).padStart(2, "0")} ${period}`;
};


module.exports=batchTime