const mongo = require('mongodb');
const config = require('../config/config');
const error = require('../helpers/error');
const log = require('../helpers/log');
const Order = require('../helpers/Order');
const debug = require('debug')('db');

class Db {
  static connect() {
    const MongoClient = new mongo.MongoClient();
    return new Promise((resolve, reject) => {
      MongoClient.connect(config.db.url, (connectionErr, db) => {
        if (connectionErr) {
          error('DB', 'Connection could not be established', connectionErr);
          reject(connectionErr);
        } else {
          global.db = db;
          log(`⚙  [DB.connect]           Success connecting to DB ${config.db.url}`);
          resolve('success');
        }
      });
    });
  }

  static close() {
    global.db.close();
  }

  static createOrUpdate(collection, data) {
    return new Promise((resolve, reject) => {
      const query = {
        name: data.name,
        slug: data.slug,
        url: data.url,
        path: data.path,
      };
      const options = {
        upsert: true,
        returnNewDocument: true,
      };

      global.db.collection(collection).findOneAndUpdate(query, data, options)
        .then((result) => {
          // debug(result);
          resolve(result);
        })
        .catch((err) => {
          error('DB', 'error inserting data', err);
          reject(err);
        });
    });
  }

  static list(collection, search, resultData = {}, limit = 0) {
    return new Promise((resolve, reject) => {
      global.db.collection(collection)
        .find(search, resultData)
        .limit(limit)
        .toArray()
        .then((result) => {
          resolve(result.sort(Order.portuguese));
        })
        .catch((err) => {
          error(err);
          reject(err);
        });
    });
  }

  static count(collection, data = {}) {
    debug('DB count');
    return new Promise((resolve, reject) => {
      global.db.collection(collection)
        .find(data)
        .count()
        .then((result) => {
          debug(result);
          resolve(result);
        })
        .catch((err) => {
          error(err);
          reject(err);
        });
    });
  }
}

module.exports = Db;
