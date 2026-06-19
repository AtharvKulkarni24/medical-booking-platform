const express=require('express');
const router=express.Router();
const searchController=require('../controllers/searchController');

router.get('/labs',searchController.searchLabs);
router.get('/labs/:lab_id/tests/:test_id',searchController.getLabTestDetails);

module.exports=router;