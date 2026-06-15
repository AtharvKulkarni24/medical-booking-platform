const {Pool}=require('pg');
require('dotenv').config();

//Create a new pool using the credentials from the .env file
const pool=new Pool({
    user:process.env.DB_USER,
    host:process.env.DB_HOST,
    databse:process.env.DB_NAME,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT
});

// A quick test to ensure the pool connects automatically when the server starts
pool.on('connect',()=>{
    console.log('Connected to the PostgreSQL Database');
});

pool.on('error',(err)=>{
    console.error('Unexpected error on idle client',err);
    process.exit(-1);
});

module.exports=pool;