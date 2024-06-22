import { ObjectId } from 'mongodb';
import { fileQueue, userQueue } from './utils/queue';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

// Process fileQueue
fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    return done(new Error('Missing fileId'));
  }

  if (!userId) {
    return done(new Error('Missing userId'));
  }

  const fileDocument = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

  if (!fileDocument) {
    return done(new Error('File not found'));
  }

  const sizes = [500, 250, 100];
  const options = { responseType: 'base64' };

  try {
    for (const size of sizes) {
      const thumbnail = await imageThumbnail(fileDocument.localPath, { width: size });
      const thumbnailPath = `${fileDocument.localPath}_${size}`;
      fs.writeFileSync(thumbnailPath, Buffer.from(thumbnail, 'base64'));
    }
    done();
  } catch (error) {
    done(error);
  }
});

fileQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

fileQueue.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed with error ${err.message}`);
});

// Process userQueue
userQueue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) {
    return done(new Error('Missing userId'));
  }

  const userDocument = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });

  if (!userDocument) {
    return done(new Error('User not found'));
  }

  console.log(`Welcome ${userDocument.email}!`);
  done();
});

userQueue.on('completed', (job) => {
  console.log(`User welcome email job ${job.id} completed!`);
});

userQueue.on('failed', (job, err) => {
  console.log(`User welcome email job ${job.id} failed with error ${err.message}`);
});

