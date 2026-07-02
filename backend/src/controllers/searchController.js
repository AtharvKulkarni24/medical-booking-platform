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
            INNER JOIN tests t
                ON l.lab_id = t.lab_id
            WHERE
                l.is_verified = TRUE
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

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM labs l
            INNER JOIN tests t
                ON l.lab_id = t.lab_id
            WHERE
                l.is_verified = TRUE
                AND t.is_verified = TRUE
                AND LOWER(t.test_name) = LOWER($1)
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
        let queryParams = [lab_id];

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
                     WHERE a.slot_id = t.slot_id 
                       AND a.appointment_date = $2 
                       AND a.status = 'CONFIRMED') AS current_bookings
                FROM time_slots t
                WHERE t.lab_id = $1 AND t.day_of_week = $3
                ORDER BY t.start_time ASC;
            `;
            queryParams.push(date, dayOfWeek);
        } else {
            // If no date is provided, just return the Master Weekly Templates
            slotsQuery = `
                SELECT
                    slot_id,
                    day_of_week,
                    start_time,
                    end_time,
                    max_capacity
                FROM time_slots
                WHERE lab_id = $1
                ORDER BY day_of_week ASC, start_time ASC;
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