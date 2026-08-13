const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.COGNODB_URI || '';
const user = process.env.COGNODB_USER || 'cognodb';
const password = process.env.COGNODB_PASSWORD || '';

let driver;

const initDB = () => {
  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    console.log('CognoDB Connected');
  } catch (error) {
    console.error('Failed to initialize database driver:', error);
  }
};

const getDriver = () => {
  if (!driver) {
    throw new Error('Database driver is not initialized. Call initDB first.');
  }
  return driver;
};

module.exports = { initDB, getDriver };