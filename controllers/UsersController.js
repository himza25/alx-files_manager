import dbClient from '../utils/db';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';

class UsersController {
  static postNew = async (req, res) => {
    try {
      const { email, password } = req.body;
      if (email === undefined)
        return res.status(400).send({ error: 'Missing email' });
      if (password === undefined)
        return res.status(400).send({ error: 'Missing password' });
      const database = dbClient.client.db('files_manager');
      const collection = database.collection('users');
      const existsEmail = await collection.findOne({ email });
      if (existsEmail) return res.status(400).send({ error: 'Already exist' });
      const hpswrd = crypto.createHash('sha1').update(password).digest('hex');
      const document = await collection.insertOne({
        email: email,
        password: hpswrd,
      });
      res.status(201).send({ _id: document.insertedId, email: email });
    } catch (err) {
      res.status(500).send('rwina');
    }
  };

  static getMe = async (req, res) => {
    if (req.headers['x-token'] === undefined)
      return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${req.headers['x-token']}`;
    const userID = await redisClient.get(key);
    if (userID === null) return res.status(401).send({ error: 'Unauthorized' });
    const database = dbClient.client.db('files_manager');
    const collection = database.collection('users');
    const existsUser = await collection.findOne({ _id: ObjectId(userID) });
    return res.send({ id: userID, email: existsUser.email });
  };
}

export default UsersController;
