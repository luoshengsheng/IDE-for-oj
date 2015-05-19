var express = require('express');
var router = express.Router();
var url = require('url');
var File = require('../lib/file.js');

/* GET test. */
router.get('/', function(req, res, next) {
  	res.send('测试中心');
});
/* GET test. post*/
router.post('/post', function(req, res, next) {
  	res.send(req.body);
});
/* GET test url parse. */
router.get('/testUrl/:usersname', function(req, res, next) {
	var arg = url.parse(req.url,true);         
	res.send(arg);
});
// /* GET test getfile parse. */
// router.get('/getonefile', function(req, res, next) {
// 	var query = {
// 		username:"22",
// 		name:"this.name"
// 	};
// 	File.getFile(query,function(err,docs){
// 		if (!docs) {
//  			res.send('无文件！' );
// 	    }else{  
// 	    	res.send(docs);
// 	    }
// 	})
// });
/* GET test getonefile parse. */
router.get('/getonefile', function(req, res, next) {
	var query = {
		name:"sef",
		username:"22"
	};
	File.getFile(query,function(err,message,doc){
		if (!doc) {
 			res.send('无文件！' );
	    }else{  
	  		//docs.forEach(function(doc){  
			//     console.log("filename"+doc.name);  
			// }); 
	    	res.send(doc);
	    }
	})
});
/* GET test getfile parse. */
router.get('/getfile', function(req, res, next) {
	File.getAllFile('22',function(err,message,docs,total){
		var result = {
			docs:docs
		}
		if (!docs) {
 			res.send('无文件！' );
	    }else{  
	  		//docs.forEach(function(doc){  
			//     console.log("filename"+doc.name);  
			// }); 
	    	res.send(result.docs);
	    }
	})
});
/* GET test savefile parse. */
router.get('/savefile', function(req, res, next) {
	var file = new File({
		name: "qwq",
		type: 'this.type',
		code: 'this.code',
		language: 'this.language',
		username: '22',
		directory: 'directory'
	});
	// res.send(file);
	file.saveFile(function(err,message,doc){
		if (err) {
 			// res.send('err！' +err);
 			res.send(err);
	    }else{  
	    	res.send(doc);
	    	// res.redirect('/test/getfile');
	    }
	})
});
/* GET test updatefile parse. */
router.get('/updatefile', function(req, res, next) {
	//filename, username, code
	File.updateFile("safdsdsdfasdfsedfasfd","22","sadfasdsadfasdf",function(err){
		if (err) {
 			res.send('err！' +err);
	    }else{  
	    	// res.send(doc);
	    	res.redirect('/test/getfile');
	    }
	})
});
router.get('/deletefile', function(req, res, next) {
	//filename, username, code
	File.deleteFile("而放弃玩儿去玩儿去安慰让我而安慰让我去而且阿伟完全","22",function(err,message){
		if (err) {
 			res.send('err！' +err);
	    }else{  
 			res.send(message);

	    	// res.redirect('/test/getfile');
	    }

	})
});
module.exports = router;
