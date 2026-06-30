const db = require("../config/db");

// --- CREATE A NEW TEST ---
exports.createTest = async (req, res) => {
  try {
    const labId = req.user.id; 
    const { test_name, description, price } = req.body;

    if (!test_name || !price) {
      return res.status(400).json({
        success: false,
        message: "Test name and price are required."
      });
    }

    const existingTest = await db.query(
      `SELECT test_id FROM tests 
       WHERE lab_id = $1 AND test_name = $2`, 
      [labId, test_name]
    );

    if (existingTest.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `${test_name} already exists in your catalog.`
      });
    }

    // UPDATED: is_verified is now explicitly FALSE upon creation
    const result = await db.query(
      `INSERT INTO tests (lab_id, test_name, description, price, is_verified) 
       VALUES ($1, $2, $3, $4, FALSE) 
       RETURNING test_id, test_name, description, price, is_verified`,
      [labId, test_name, description, price]
    );

    res.status(201).json({
      success: true,
      message: "Test added to catalog successfully. Pending verification.",
      test: result.rows
    });

  } catch (error) {
    console.error("Create Test Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error while creating test." });
  }
};

// --- GET ALL TESTS FOR A SPECIFIC LAB ---
exports.getAllTests = async (req, res) => {
  try {
    const labId = req.user.id;

    const result = await db.query(
      `SELECT test_id, test_name, description, price, is_verified 
       FROM tests 
       WHERE lab_id = $1 
       ORDER BY test_name ASC`, 
      [labId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      tests: result.rows
    });

  } catch (error) {
    console.error("Get All Tests Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error while fetching tests." });
  }
};

// --- GET A SPECIFIC TEST BY ID ---
exports.getTestById = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      `SELECT test_id, test_name, description, price, is_verified 
       FROM tests 
       WHERE test_id = $1 AND lab_id = $2`,
      [id, labId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Test not found in your catalog." });
    }

    res.status(200).json({
      success: true,
      test: result.rows
    });

  } catch (error) {
    console.error("Get Test By ID Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

// --- UPDATE A TEST ---
exports.updateTest = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;
    const { test_name, description, price } = req.body;

    // UPDATED: Using COALESCE for partial updates and forcing is_verified = FALSE
    const result = await db.query(
      `UPDATE tests 
       SET 
         test_name = COALESCE($1, test_name), 
         description = COALESCE($2, description), 
         price = COALESCE($3, price),
         is_verified = FALSE
       WHERE test_id = $4 AND lab_id = $5 
       RETURNING test_id, test_name, description, price, is_verified;`,
      [test_name, description, price, id, labId] 
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Test not found or you do not have permission to edit it." 
      });
    }

    res.status(200).json({
      success: true,
      message: "Test updated successfully. It has been marked for re-verification.",
      test: result.rows
    });

  } catch (error) {
    console.error("Update Test Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error while updating test." });
  }
};

// --- DELETE A TEST ---
exports.deleteTest = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM tests 
       WHERE test_id = $1 AND lab_id = $2 
       RETURNING test_id`,
      [id, labId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Test not found or already deleted." 
      });
    }

    res.status(200).json({
      success: true,
      message: "Test permanently removed from catalog."
    });

  } catch (error) {
    console.error("Delete Test Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error while deleting test." });
  }
};