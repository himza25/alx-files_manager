import dbClient from '../utils/db';
import crypto from 'crypto';
const { v4: uuidv4 } = require('uuid');
import redisClient from '../utils/redis';

class AuthController {
  static getConnect = async (req, res) => {
    let auth = req.headers['authorization'];
    auth = auth.slice(6);
    const authString = Buffer.from(auth, 'base64').toString('utf-8');
    const [email, hidepassword] = authString.split(':');
    const password = crypto
      .createHash('sha1')
      .update(hidepassword)
      .digest('hex');
    const database = dbClient.client.db('files_manager');
    const collection = database.collection('users');
    const existsUser = await collection.findOne({ email, password });
    if (!existsUser) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${uuidv4()}`;
    redisClient.set(key, existsUser._id.toString(), 86400);
    return res.status(200).send({ token: key.slice(5) });
  };
  static getDisconnect = async (req, res) => {
    if (req.headers['x-token'] === undefined)
      return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${req.headers['x-token']}`;
    const userID = await redisClient.get(key);
    if (userID === null) return res.status(401).send({ error: 'Unauthorized' });
    redisClient.del(key);
  };
}

export default AuthController;
