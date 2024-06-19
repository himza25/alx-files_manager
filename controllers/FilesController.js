import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fs from 'fs';
const { v4: uuidv4 } = require('uuid');

class FilesController {
  static postUpload = async (req, res) => {
    if (req.headers['x-token'] === undefined)
      return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${req.headers['x-token']}`;
    const userID = await redisClient.get(key);
    if (userID === null) return res.status(401).send({ error: 'Unauthorized' });
    const database = dbClient.client.db(dbClient.DB_DATABASE);
    const collection = database.collection('files');
    const { name, type, parentId, isPublic, data } = req.body;
    if (name === undefined)
      return res.status(400).send({ error: 'Missing name' });
    if (type === undefined || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).send({ error: 'Missing type' });
    }
    if (data === undefined && type !== 'folder') {
      return res.status(400).send({ error: 'Missing data' });
    }
    if (parentId !== undefined) {
      const existsFile = await collection.findOne({ _id: ObjectId(parentId) });
      if (existsFile === null) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (existsFile.type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      const newFile = await collection.insertOne({
        name: name,
        userId: userID,
        type: type,
        isPublic: isPublic === undefined ? false : isPublic,
        parentId: parentId === undefined ? 0 : parentId,
      });
      return res.status(201).send({
        id: newFile.ops[0]._id,
        userId: newFile.ops[0].userId,
        name: newFile.ops[0].name,
        type: newFile.ops[0].type,
        isPublic: newFile.ops[0].isPublic,
        parentId: newFile.ops[0].parentId,
      });
    }
    const path =
      process.env.FOLDER_PATH === undefined
        ? '/tmp/files_manager/'
        : process.env.FOLDER_PATH;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
    const filePath = `${path}${uuidv4()}`;
    fs.writeFile(
      filePath,
      Buffer.from(data, 'base64').toString('utf-8'),
      (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log('tcreaa');
        }
      }
    );
    const newFile = await collection.insertOne({
      name: name,
      userId: userID,
      type: type,
      isPublic: isPublic === undefined ? false : isPublic,
      parentId: parentId === undefined ? 0 : parentId,
      localPath: filePath,
    });
    return res.status(201).send({
      id: newFile.ops[0]._id,
      userId: newFile.ops[0].userId,
      name: newFile.ops[0].name,
      type: newFile.ops[0].type,
      isPublic: newFile.ops[0].isPublic,
      parentId: newFile.ops[0].parentId,
    });
  };
}

export default FilesController;
