const pool = require("../config/db");

// GET /api/labs/profile
exports.getLabProfile = async (req, res) => {
  try {
    const labId = req.user.id;

    const result = await pool.query(
      "SELECT * FROM labs WHERE id = $1",
      [labId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Lab not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server Error",
    });
  }
};