var settings = require('./DBsettings'),
	Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server;
	module.exports = new Db(settings.db, new Server(settings.host, "27017", {}), {
	safe: true
});