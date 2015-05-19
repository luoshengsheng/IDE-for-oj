var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var User = require('../lib/user.js');
var File = require('../lib/file.js');
var Post = require("../lib/post.js");

router.get('/', checkLogin);
/* GET index page. */
router.get('/', function(req, res, next) {
  res.render('index', {});
});
/* post saveNewFile. */
router.post('/saveNewFile',function(req, res, next) {
  var data = {
      name: req.body.name,
      code: req.body.code,
      type: req.body.type,
      language: req.body.language,
      username: req.body.username,
      directory: req.body.directory
  };
  var file = new File(data);
  file.saveFile(function(err ,message, doc){
    var result = {
      message:message,
      doc:doc
    };
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  });
  
});
/* post initFilelist. */
router.post('/initFilelist',function(req, res, next) {
  File.getAllFile(req.body.username,function(err ,message, docs, total){
    var result = {
      err:err,
      message:message,
      docs:docs,
      total:total
    };
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  });
});
/* post deleteFile. */
router.post('/deleteFile',function(req, res, next) {
  File.deleteFile(req.body.filename,req.body.username,function(err ,message){
    var result = {
      err:err,
      message:message
    };
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  });
});
/* post updateFile. */
router.post('/updateFile',function(req, res, next) {
  File.updateFile(req.body.filename,req.body.username,req.body.code,function(err ,message){
    var result = {
      err:err,
      message:message
    };
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  });
});
// router.post('/login', checkNotLogin);
/* post login 处理. */
router.post('/login', function(req, res, next) {
  console.log("/loginpost 登陆请求处理");
  //生成口令散列值
  var username = req.body.username;
  var md5 = crypto.createHash('md5');
  var password = md5.update(req.body.password).digest('base64');
  if (!username) {
    req.flash('error', '用户名不能为空');
    return res.redirect('/login');
  }
  if (!password) {
    req.flash('error', '密码不能为空');
    return res.redirect('/login');
  }
  //验证处理
  User.get(username, function(err, user) {
    if (!user) {
      req.flash('error', '用户不存在');
      return res.redirect('/login');
    }
    if (user.password != password) {
      req.flash('error', '用户口令错误');
      return res.redirect('/login');
    }
    //成功验证
    console.log(user);
    req.session.user = user;
    //设置cookie
    //eg:res.cookie('name', 'laodoujiao', { domain: '.com', path: '/login', secure: true,expires: new Date(Date.now() + 900000), httpOnly: true,maxAge:900000 });
    res.cookie('username',username,{maxAge:90000});
    res.cookie('password',password,{maxAge:90000});
    console.log("登陆成功");
    req.flash('success', '登陆成功');
    res.redirect('/');
  });
});
// router.get('/login', checkNotLogin);
/* GET login page. */
router.get('/login', function(req, res, next) {
  res.render('login', {});
});

router.get('/logout', checkLogin);
/* GET logout page. */
router.get('/logout', function(req, res, next) {
  req.session.user = null;
  res.cookie('username',null,{maxAge:0});
  res.cookie('password',null,{maxAge:0});
  req.flash('success', '登出成功');
  res.redirect('/login');
});

// router.get('/reg', checkNotLogin);
/* GET register page. */
router.get('/reg', function(req, res, next) {
  res.render('register', {});
});

// router.post('/reg', checkNotLogin);
/*reg post 响应函数 start*/
router.post('/reg', function(req, res, next) {
  console.log("/regpost  注册请求处理");
  if (!req.body['password_repeat'] || !req.body['password']) {
    req.flash('error', ' 密码输入不能为空');
    return res.redirect('/reg');
  }
  if (!req.body['username']) {
    req.flash('error', ' 用户名不能为空');
    return res.redirect('/reg');
  }
  //检验用户两次输入的口令是否一致
  if (req.body['password_repeat'] != req.body['password']) {
    req.flash('error', ' 两次输入的口令不一致');
    return res.redirect('/reg');
  }
  //生成口令的散列值
  var md5 = crypto.createHash('md5');
  var password = md5.update(req.body.password).digest('base64');
  var newUser = new User({
    name: req.body.username,
    password: password,
  });
  //检查用户名是否已经存在
  User.get(newUser.name, function(err, user) {
    if (user)
      err = '用户名已经存在.';
    if (err) {
      req.flash('error', err);
      return res.redirect('/reg');
    }
    //如果不存在则新增用户
    newUser.save(function(err) {
      if (err) {
        console.log("错误", err);
        req.flash('error', err);
        return res.redirect('/reg');
      }
      req.session.user = newUser;
      req.flash('success', ' 注册成功！请登录');
      res.redirect('/login');
    });
  });
});

function checkLogin(req, res, next) {
  console.log("sdf"+req.session.username)
  if (!req.session.user) {
    req.flash('error', ' 未登陆！请先登录');
    return res.redirect('/login');
  }
  next();
}

function checkNotLogin(req, res, next) {
  console.log("checkNotLogin->"+req.cookie.username);
  if (req.session.user) {
    req.flash('error', ' 已登入');
    return res.redirect('/');
  }
  next();
}
/* GET user page. */
router.get('/u/:user', function(req, res, next) {
  User.get(req.params.user, function(err, user) {
    if (!user) {
      req.flash('error', ' 用户不存在');
      return res.redirect('/');
    }
    Post.get(user.name, function(err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('user', {
        title: user.name,
        posts: posts,
      });
    });
  });
});

router.get('/post', checkLogin);
/* post postblog 处理 */
router.post('/post', function(req, res, next) {
  var currentUser = req.session.user;
  var post = new Post(currentUser.name, req.body.post);
  post.save(function(err) {
    if (err) {
      req.flash('error', err);
      res.redirect('/');
    }
    req.flash('success', '发表成功！');
    res.redirect('/u/' + currentUser.name);
  });
});
module.exports = router;