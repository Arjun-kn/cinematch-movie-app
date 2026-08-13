const { getDriver } = require('../config/db');

// Get all users 
const getUsers = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.executeRead(tx =>
      tx.run(`MATCH (u:User) RETURN u.id AS id, u.name AS name, u.email AS email, u.avatar AS avatar`)
    );
    const users = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      email: record.get('email'),
      avatar: record.get('avatar'),
    }));
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  } finally {
    await session.close();
  }
};

module.exports = { getUsers };