const db = require('../config/db');
// --- SEARCH LABS WITH SINGLE QUERY, DISTANCE SORTING & PAGINATION ---
exports.searchLabs = async (req, res) => {
    try {
        const { test, lat, lng, page = 1, limit = 10 } = req.query;

        // Validate required fields
        if (!test || lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                error: "Please provide test name, latitude, and longitude."
            });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        // Validate coordinates
        if (isNaN(userLat) || isNaN(userLng)) {
            return res.status(400).json({
                success: false,
                error: "Invalid latitude or longitude."
            });
        }

        // Validate pagination
        let pageNum = parseInt(page, 10) || 1;
        let limitNum = parseInt(limit, 10) || 10;

        if (pageNum < 1) pageNum = 1;
        if (limitNum < 1 || limitNum > 100) limitNum = 10;

        const offset = (pageNum - 1) * limitNum;

        const searchQuery = `
            SELECT
                l.lab_id,
                l.name AS lab_name,
                (l.name LIKE 'DEMO DATA - %') AS is_demo,
                l.address_text,
                ST_Y(l.location_coordinates::geometry) AS latitude,
                ST_X(l.location_coordinates::geometry) AS longitude,
                l.average_rating,
                t.test_id,
                t.test_name,
                t.price,
                t.sample_type,
                t.fasting_required,
                t.turnaround_hours,
                tc.name AS category_name,
                tc.icon AS category_icon,
                ROUND(
                    (
                        ST_Distance(
                            l.location_coordinates,
                            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                        ) / 1000.0
                    )::numeric,
                    1
                ) AS distance_km
            FROM labs l
            INNER JOIN tests t
                ON l.lab_id = t.lab_id
            LEFT JOIN master_tests mt 
                ON t.master_test_id = mt.master_test_id
            LEFT JOIN test_categories tc 
                ON (t.category_id = tc.category_id OR mt.category_id = tc.category_id)
            WHERE
                l.is_verified = TRUE
                AND t.is_verified = TRUE
                AND (
                    LOWER(t.test_name) ILIKE LOWER($3)
                    OR LOWER(mt.test_name) ILIKE LOWER($3)
                    OR LOWER(tc.name) ILIKE LOWER($3)
                    OR EXISTS (
                        SELECT 1 FROM unnest(mt.aliases) alias 
                        WHERE LOWER(alias) ILIKE LOWER($3)
                    )
                    OR LOWER(t.test_name) ILIKE LOWER('%' || $3 || '%')
                )
                AND ST_DWithin(
                    l.location_coordinates,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    50000
                )
            ORDER BY distance_km ASC
            LIMIT $4 OFFSET $5;
        `;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM labs l
            INNER JOIN tests t
                ON l.lab_id = t.lab_id
            LEFT JOIN master_tests mt 
                ON t.master_test_id = mt.master_test_id
            LEFT JOIN test_categories tc 
                ON (t.category_id = tc.category_id OR mt.category_id = tc.category_id)
            WHERE
                l.is_verified = TRUE
                AND t.is_verified = TRUE
                AND (
                    LOWER(t.test_name) ILIKE LOWER($1)
                    OR LOWER(mt.test_name) ILIKE LOWER($1)
                    OR LOWER(tc.name) ILIKE LOWER($1)
                    OR EXISTS (
                        SELECT 1 FROM unnest(mt.aliases) alias 
                        WHERE LOWER(alias) ILIKE LOWER($1)
                    )
                    OR LOWER(t.test_name) ILIKE LOWER('%' || $1 || '%')
                )
                AND ST_DWithin(
                    l.location_coordinates,
                    ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                    50000
                );
        `;

        const [result, countResult] = await Promise.all([
            db.query(searchQuery, [
                userLng,
                userLat,
                test,
                limitNum,
                offset
            ]),
            db.query(countQuery, [
                test,
                userLng,
                userLat
            ])
        ]);

        const totalResults = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalResults / limitNum);

        if (totalResults === 0) {
            return res.status(200).json({
                success: true,
                results_count: 0,
                total_results: 0,
                page: pageNum,
                limit: limitNum,
                total_pages: 0,
                has_next_page: false,
                has_prev_page: false,
                message: `No verified labs found offering ${test} within a 50 km radius.`,
                labs: []
            });
        }

        return res.status(200).json({
            success: true,
            results_count: result.rows.length,
            total_results: totalResults,
            page: pageNum,
            limit: limitNum,
            total_pages: totalPages,
            has_next_page: pageNum < totalPages,
            has_prev_page: pageNum > 1,
            message: `Found ${totalResults} labs offering ${test}.`,
            labs: result.rows
        });

    } catch (error) {
        console.error("Search Engine Error:", error);

        return res.status(500).json({
            success: false,
            error: "Server error while searching for labs."
        });
    }
};

// --- GET SPECIFIC LAB & TEST DETAILS WITH TIME SLOTS ---

exports.getLabTestDetails = async (req, res) => {
    try {
        const { lab_id, test_id } = req.params;
        const { date } = req.query; // NEW: Optional date parameter for dynamic availability

        // Validate params
        if (!lab_id || !test_id) {
            return res.status(400).json({
                success: false,
                error: 'lab_id and test_id are required.'
            });
        }

        const detailsQuery = `
            SELECT
                l.lab_id,
                l.name AS lab_name,
                (l.name LIKE 'DEMO DATA - %') AS is_demo,
                l.address_text,
                ST_Y(l.location_coordinates::geometry) AS latitude,
                ST_X(l.location_coordinates::geometry) AS longitude,
                l.average_rating,
                l.auth_document_url,
                t.test_id,
                t.test_name,
                t.price,
                t.description
            FROM labs l
            JOIN tests t
                ON l.lab_id = t.lab_id
            WHERE l.lab_id = $1
              AND t.test_id = $2
              AND l.is_verified = TRUE
              AND t.is_verified = TRUE;
        `;

        let slotsQuery = "";
        let queryParams = [lab_id, test_id];

        // NEW LOGIC: Dynamic Slot Calculation based on our new Architecture
        if (date) {
            // If the frontend asks for a specific date, calculate real-time availability
            const targetDate = new Date(date);
            const dayOfWeek = targetDate.getDay(); // Returns 0-6 (Sunday-Saturday)

            slotsQuery = `
                SELECT
                    t.slot_id,
                    t.day_of_week,
                    t.start_time,
                    t.end_time,
                    t.max_capacity,
                    (SELECT COUNT(*) FROM appointments a
                     JOIN lab_test_slots booked ON booked.lab_test_slot_id = a.lab_test_slot_id
                     WHERE booked.slot_id = t.slot_id
                       AND a.appointment_date = $3
                       AND a.status = 'CONFIRMED') AS current_bookings
                FROM lab_test_slots selected
                JOIN time_slots t ON t.slot_id = selected.slot_id AND t.lab_id = selected.lab_id
                WHERE selected.lab_id = $1 AND selected.test_id = $2
                  AND t.day_of_week = $4
                ORDER BY t.start_time ASC;
            `;
            queryParams.push(date, dayOfWeek);
        } else {
            // If no date is provided, just return the Master Weekly Templates
            slotsQuery = `
                SELECT
                    t.slot_id,
                    t.day_of_week,
                    t.start_time,
                    t.end_time,
                    t.max_capacity
                FROM lab_test_slots selected
                JOIN time_slots t ON t.slot_id = selected.slot_id AND t.lab_id = selected.lab_id
                WHERE selected.lab_id = $1 AND selected.test_id = $2
                ORDER BY t.day_of_week ASC, t.start_time ASC;
            `;
        }

        const [detailsResult, slotsResult] = await Promise.all([
            db.query(detailsQuery, [lab_id, test_id]),
            db.query(slotsQuery, queryParams)
        ]);

        if (detailsResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Lab or test not found, or not verified.'
            });
        }

        // Optional: Filter out fully booked slots if a specific date was searched
        let availableSlots = slotsResult.rows;
        if (date) {
            availableSlots = slotsResult.rows.filter(
                slot => parseInt(slot.current_bookings) < parseInt(slot.max_capacity)
            );
            
            // Note: For same-day searches, you can also filter out times that have already passed 
            // using JavaScript Date comparisons here, similar to what we did in the booking controller!
        }

        return res.status(200).json({
            success: true,
            data: {
                lab_and_test_info: detailsResult.rows[0],
                time_slots: availableSlots
            }
        });

    } catch (error) {
        console.error('Fetch Lab Details Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Server error while fetching details.'
        });
    }
};

// --- SEARCH LAB DIRECTORY (BY NAME & LOCATION) ---
exports.searchLabDirectory = async (req, res) => {
    try {
        const { lab_name, lat, lng, page = 1, limit = 20 } = req.query;

        // Location is required to find labs within 50km
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                error: "Latitude and longitude are required to find nearby labs."
            });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        if (isNaN(userLat) || isNaN(userLng)) {
            return res.status(400).json({ success: false, error: "Invalid coordinates." });
        }

        let pageNum = parseInt(page, 10) || 1;
        let limitNum = parseInt(limit, 10) || 20;
        const offset = (pageNum - 1) * limitNum;

        // Dynamic Query Building
        let nameFilter = "";
        let queryParams = [userLng, userLat, limitNum, offset];

        if (lab_name && lab_name.trim() !== "") {
            nameFilter = "AND LOWER(name) LIKE LOWER($5)";
            queryParams.push(`%${lab_name.trim()}%`); // Allows partial matches
        }

        const searchQuery = `
            SELECT
                lab_id,
                name AS lab_name,
                (name LIKE 'DEMO DATA - %') AS is_demo,
                address_text,
                average_rating,
                ROUND(
                    (ST_Distance(location_coordinates, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000.0)::numeric, 1
                ) AS distance_km
            FROM labs
            WHERE is_verified = TRUE
              AND ST_DWithin(
                  location_coordinates,
                  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                  50000 -- 50 km radius
              )
              ${nameFilter}
            ORDER BY distance_km ASC
            LIMIT $3 OFFSET $4;
        `;

        const result = await db.query(searchQuery, queryParams);

        return res.status(200).json({
            success: true,
            results_count: result.rows.length,
            labs: result.rows
        });

    } catch (error) {
        console.error("Lab Directory Search Error:", error);
        return res.status(500).json({ success: false, error: "Server error while searching lab directory." });
    }
};

// --- GET SINGLE LAB DETAILS AND ALL ITS TESTS ---
exports.getSingleLabDetails = async (req, res) => {
    try {
        const { lab_id } = req.params;

        if (!lab_id || lab_id === 'undefined' || isNaN(parseInt(lab_id))) {
            return res.status(400).json({ 
                success: false, 
                error: "Invalid Lab ID provided in the URL." 
            });
        }
        
        // 1. Fetch Lab Profile Details
        const labQuery = `
            SELECT 
                lab_id, 
                name AS lab_name, 
                name LIKE 'DEMO DATA - %' AS is_demo,
                address_text, 
                ST_Y(location_coordinates::geometry) AS latitude,
                ST_X(location_coordinates::geometry) AS longitude,
                average_rating, 
                is_verified
            FROM labs
            WHERE lab_id = $1 AND is_verified = TRUE;
        `;
        const labResult = await db.query(labQuery, [lab_id]);

        if (labResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Lab not found or not verified." });
        }

        // 2. Fetch All Tests Offered By This Lab
        const testsQuery = `
            SELECT 
                test_id, 
                test_name, 
                price, 
                description
            FROM tests
            WHERE lab_id = $1 AND is_verified = TRUE
            ORDER BY test_name ASC;
        `;
        const testsResult = await db.query(testsQuery, [lab_id]);

        return res.status(200).json({
            success: true,
            lab: labResult.rows[0],
            tests: testsResult.rows,
            total_tests: testsResult.rows.length
        });

    } catch (error) {
        console.error("Get Single Lab Error:", error);
        return res.status(500).json({ success: false, error: "Server error while fetching lab details." });
    }
};

// --- GET ALL TEST CATEGORIES ---
exports.getCategories = async (req, res) => {
    try {
        const query = `
            SELECT 
                tc.category_id,
                tc.name,
                tc.icon,
                tc.description,
                COUNT(DISTINCT t.test_id) AS available_tests_count
            FROM test_categories tc
            LEFT JOIN master_tests mt ON tc.category_id = mt.category_id
            LEFT JOIN tests t ON (t.category_id = tc.category_id OR t.master_test_id = mt.master_test_id) AND t.is_verified = TRUE
            GROUP BY tc.category_id, tc.name, tc.icon, tc.description
            ORDER BY tc.category_id ASC;
        `;
        const result = await db.query(query);
        return res.status(200).json({ success: true, categories: result.rows });
    } catch (error) {
        console.error("Get Categories Error:", error);
        return res.status(500).json({ success: false, error: "Failed to fetch test categories." });
    }
};

// --- GET MASTER TESTS DICTIONARY FOR LAB AUTOCOMPLETE ---
exports.getMasterTests = async (req, res) => {
    try {
        const { category_id, q } = req.query;
        let filter = "";
        const params = [];

        if (category_id) {
            params.push(parseInt(category_id, 10));
            filter += ` AND mt.category_id = $${params.length}`;
        }

        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            filter += ` AND (mt.test_name ILIKE $${params.length} OR EXISTS (SELECT 1 FROM unnest(mt.aliases) alias WHERE alias ILIKE $${params.length}))`;
        }

        const query = `
            SELECT 
                mt.master_test_id,
                mt.category_id,
                mt.test_name,
                mt.description,
                mt.sample_type,
                mt.fasting_required,
                mt.turnaround_hours,
                mt.aliases,
                tc.name AS category_name,
                tc.icon AS category_icon
            FROM master_tests mt
            LEFT JOIN test_categories tc ON mt.category_id = tc.category_id
            WHERE 1=1 ${filter}
            ORDER BY mt.test_name ASC;
        `;
        const result = await db.query(query, params);
        return res.status(200).json({ success: true, master_tests: result.rows });
    } catch (error) {
        console.error("Get Master Tests Error:", error);
        return res.status(500).json({ success: false, error: "Failed to fetch master test catalog." });
    }
};

// --- REAL-TIME SEARCH AUTO-SUGGESTIONS FOR PATIENT SEARCH BAR ---
exports.getSearchSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) {
            return res.status(200).json({ success: true, suggestions: [] });
        }
        const term = `%${q.trim()}%`;
        const query = `
            SELECT DISTINCT 
                mt.test_name AS label, 
                'test' AS type,
                tc.name AS category_name,
                tc.icon AS category_icon
            FROM master_tests mt
            LEFT JOIN test_categories tc ON mt.category_id = tc.category_id
            WHERE mt.test_name ILIKE $1 
               OR EXISTS (SELECT 1 FROM unnest(mt.aliases) a WHERE a ILIKE $1)
            
            UNION
            
            SELECT DISTINCT 
                name AS label, 
                'category' AS type,
                name AS category_name,
                icon AS category_icon
            FROM test_categories
            WHERE name ILIKE $1
            
            LIMIT 8;
        `;
        const result = await db.query(query, [term]);
        return res.status(200).json({ success: true, suggestions: result.rows });
    } catch (error) {
        console.error("Get Suggestions Error:", error);
        return res.status(500).json({ success: false, error: "Failed to fetch search suggestions." });
    }
};