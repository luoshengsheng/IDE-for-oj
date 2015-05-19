var express = require('express');
var router = express.Router();
var url = require('url');
var User = require('../lib/user.js');

/* GET users listing. */
router.get('/', function(req, res, next) {
  	res.send('这里是个人中心');
});
/* GET users person listing. */
router.get('/showUser', function(req, res, next) {
	var arg = url.parse(req.url,true);         
	// res.send(arg);
	User.getAll(function(err,doc){
		console.log(doc);
		if (!doc) {
 			res.send('无用户！' );
	    }else{
	    	// var user = JSON.parse(doc);
	    	// res.send(doc[0].name);
	    	res.send(doc);

	    }
	})
});
/* GET users person listing. */
router.get('/:username', function(req, res, next) {
	res.send("username:"+req.params.username);
});
module.exports = router;
