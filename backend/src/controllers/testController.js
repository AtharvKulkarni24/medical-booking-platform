const db = require("../config/db");

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
      `SELECT id FROM tests
       WHERE lab_id = $1
       AND LOWER(test_name) = LOWER($2)`,
      [labId, test_name]
    );

    if (existingTest.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Test already exists."
      });
    }

    const result = await db.query(
      `INSERT INTO tests
      (lab_id, test_name, description, price)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        labId,
        test_name,
        description,
        price
      ]
    );

    res.status(201).json({
      success: true,
      message: "Test created successfully.",
      test: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.getAllTests = async (req, res) => {
  try {
    const labId = req.user.id;

    const result = await db.query(
      `SELECT
        id,
        test_name,
        description,
        price,
        created_at
      FROM tests
      WHERE lab_id = $1
      ORDER BY created_at DESC`,
      [labId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      tests: result.rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        id,
        test_name,
        description,
        price,
        created_at
      FROM tests
      WHERE id = $1
      AND lab_id = $2`,
      [id, labId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found."
      });
    }

    res.status(200).json({
      success: true,
      test: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};
exports.updateTest = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;
    const { test_name, description, price } = req.body;

    const existingTest = await db.query(
      `SELECT id
       FROM tests
       WHERE id = $1
       AND lab_id = $2`,
      [id, labId]
    );

    if (existingTest.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found."
      });
    }

    const result = await db.query(
      `UPDATE tests
        SET
    test_name = $1,
    description = $2,
    price = $3
WHERE id = $4
RETURNING id, test_name, description, price;`,
      [test_name, description, price, id]
    );

    res.status(200).json({
      success: true,
      message: "Test updated successfully.",
      test: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const labId = req.user.id;
    const { id } = req.params;

    // Check if the test belongs to the logged-in lab
    const existingTest = await db.query(
      `SELECT id
       FROM tests
       WHERE id = $1
       AND lab_id = $2`,
      [id, labId]
    );

    if (existingTest.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test not found."
      });
    }

    await db.query(
      `DELETE FROM tests
       WHERE id = $1
       AND lab_id = $2`,
      [id, labId]
    );

    res.status(200).json({
      success: true,
      message: "Test deleted successfully."
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};