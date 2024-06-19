import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const DB_HOST = process.env.DB_HOST === undefined ? 'localhost' : process.env.DB_HOST;
    const DB_PORT = process.env.DB_PORT === undefined ? '27017' : process.env.DB_PORT;
    this.DB_DATABASE = process.env.DB_DATABASE === undefined
      ? 'files_manager'
      : process.env.DB_DATABASE;
    this.client = new MongoClient(
      `mongodb://${DB_HOST}:${DB_PORT}/${this.DB_DATABASE}`,
    );
    this.client.connect();
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    return new Promise((resolve) => {
      const db = this.client.db(this.DB_DATABASE);
      const userCollection = db.collection('users');
      resolve(userCollection.countDocuments());
    });
  }

  async nbFiles() {
    return new Promise((resolve) => {
      const db = this.client.db(this.DB_DATABASE);
      const userCollection = db.collection('files');
      resolve(userCollection.countDocuments());
    });
  }
}

const dbClient = new DBClient();
export default dbClient;
