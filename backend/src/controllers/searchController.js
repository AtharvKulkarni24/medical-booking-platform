const db = require('../config/db');

// --- SEARCH LABS WITH SINGLE QUERY, DISTANCE SORTING & PAGINATION ---
exports.searchLabs = async (req, res) => {
    try {
        const { test, lat, lng, page = 1, limit = 10 } = req.query;

        // Validate required fields
        if (!test || !lat || !lng) {
            return res.status(400).json({
                success: false,
                error: 'Please provide test name, latitude, and longitude.'
            });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        // Validate coordinates
        if (isNaN(userLat) || isNaN(userLng)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid latitude or longitude.'
            });
        }

        // Validate pagination parameters
        let pageNum = parseInt(page, 10) || 1;
        let limitNum = parseInt(limit, 10) || 10;

        if (pageNum < 1) pageNum = 1;
        if (limitNum < 1 || limitNum > 100) limitNum = 10; // Max 100 per page

        const offset = (pageNum - 1) * limitNum;

        // Single query: Get ALL labs within 50km, sorted by distance, with pagination
        const query = `
            SELECT
                l.lab_id,
                l.name AS lab_name,
                l.address_text,
                ST_Y(l.location_coordinates::geometry) AS latitude,
                ST_X(l.location_coordinates::geometry) AS longitude,
                l.average_rating,
                t.test_id,
                t.test_name,
                t.price,

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
            JOIN tests t
                ON l.lab_id = t.lab_id

            WHERE l.is_verified = TRUE
              AND t.is_verified = TRUE
              AND LOWER(t.test_name) = LOWER($3)

              AND ST_DWithin(
                    l.location_coordinates,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    50000
              )

            ORDER BY distance_km ASC
            LIMIT $4 OFFSET $5;
        `;

        // Get total count for pagination metadata
        const countQuery = `
            SELECT COUNT(*) as total
            FROM labs l
            JOIN tests t
                ON l.lab_id = t.lab_id
            WHERE l.is_verified = TRUE
              AND t.is_verified = TRUE
              AND LOWER(t.test_name) = LOWER($1)
              AND ST_DWithin(
                    l.location_coordinates,
                    ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                    50000
              );
        `;

        const [result, countResult] = await Promise.all([
            db.query(query, [userLng, userLat, test, limitNum, offset]),
            db.query(countQuery, [test, userLng, userLat])
        ]);

        const totalResults = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalResults / limitNum);

        if (result.rows.length === 0 && totalResults === 0) {
            return res.status(200).json({
                success: true,
                results_count: 0,
                total_results: 0,
                page: pageNum,
                limit: limitNum,
                total_pages: 0,
                message: `No verified labs found offering "${test}" within a 50 km radius.`,
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
            message: `Found ${totalResults} labs offering "${test}".`,
            labs: result.rows
        });

    } catch (error) {
        console.error('Search Engine Error:', error);

        return res.status(500).json({
            success: false,
            error: 'Server error while searching for labs.'
        });
    }
};

// --- GET SPECIFIC LAB & TEST DETAILS WITH TIME SLOTS ---

exports.getLabTestDetails = async (req, res) => {
    try {
        const { lab_id, test_id } = req.params;

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

        const slotsQuery = `
            SELECT
                slot_id,
                start_time,
                end_time,
                max_capacity,
                current_bookings
            FROM time_slots
            WHERE lab_id = $1
              AND start_time > NOW()
              AND current_bookings < max_capacity
            ORDER BY start_time ASC;
        `;

        const [detailsResult, slotsResult] = await Promise.all([
            db.query(detailsQuery, [lab_id, test_id]),
            db.query(slotsQuery, [lab_id])
        ]);

        if (detailsResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Lab or test not found, or not verified.'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                lab_and_test_info: detailsResult.rows[0],
                available_time_slots: slotsResult.rows
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