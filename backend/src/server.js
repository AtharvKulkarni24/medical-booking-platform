//backend/src/server.js
const express=require('express');
const cors=require('cors');
require('dotenv').config();

//Import the database connection pool
const db=require('./config/db');

const app=express();

// ----Middleware----
// Allows request from our Vite React Frontend
app.use(cors());
//Parse incoming JSON payloads in the request body
app.use(express.json());

// ---Health Check Route ---
// A simple route to test if the server and database are alive
app.get('/api/health',async(req,res)=>{
    try{
        //Run a tiny query against the database
        const result=await db.query('SELECT NOW()');
        res.status(200).json({
            success:true,
            message:'Medical Platform API is running smoothly!',
            database_time:result.rows[0].now
        })
    }catch(error){
            console.log('Database Connection Error:',error);
            res.status(500).json({success:false,message:'Database connection failed.'});
    }
});

    // --- Server Initialization ---
    const PORT=process.env.PORT || 5000;
    app.listen(PORT,()=>{
        console.log('Server is running on http://localhost:' + PORT);
    });