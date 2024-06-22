import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fileQueue from '../utils/queue';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId), userId });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDocument = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json({ id: result.insertedId, ...fileDocument });
    }

    const localPath = path.join(FOLDER_PATH, uuidv4());
    fs.mkdirSync(FOLDER_PATH, { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

    fileDocument.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(fileDocument);

    if (type === 'image') {
      await fileQueue.add('generateThumbnail', { userId, fileId: result.insertedId });
    }

    return res.status(201).json({ id: result.insertedId, ...fileDocument });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const fileDocument = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

    if (!fileDocument) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(fileDocument);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = 0, page = 0 } = req.query;
    const pageNum = parseInt(page, 10);
    const query = { userId, parentId };

    const files = await dbClient.db.collection('files')
      .find(query)
      .skip(pageNum * 20)
      .limit(20)
      .toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const fileDocument = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

    if (!fileDocument) {
      return res.status(404).json({ error: 'Not found' });
    }

    fileDocument.isPublic = true;
    await dbClient.db.collection('files').updateOne({ _id: new ObjectId(fileId), userId }, { $set: { isPublic: true } });

    return res.status(200).json(fileDocument);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const fileDocument = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

    if (!fileDocument) {
      return res.status(404).json({ error: 'Not found' });
    }

    fileDocument.isPublic = false;
    await dbClient.db.collection('files').updateOne({ _id: new ObjectId(fileId), userId }, { $set: { isPublic: false } });

    return res.status(200).json(fileDocument);
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;
    const size = req.query.size;

    const fileDocument = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId) });

    if (!fileDocument) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!fileDocument.isPublic) {
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId || userId !== fileDocument.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (fileDocument.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let filePath = fileDocument.localPath;

    if (size) {
      const validSizes = ['500', '250', '100'];
      if (!validSizes.includes(size)) {
        return res.status(400).json({ error: 'Invalid size' });
      }
      filePath = `${fileDocument.localPath}_${size}`;
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(fileDocument.name);
    res.setHeader('Content-Type', mimeType);
    fs.createReadStream(filePath).pipe(res);
  }
}

export default FilesController;
