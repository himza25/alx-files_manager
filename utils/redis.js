import redis from 'redis';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => {
      console.log(err);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return new Promise((resolve) => {
      this.client.get(key, (err, reply) => {
        resolve(reply);
      });
    });
  }

  async set(key, val, duration) {
    this.client.set(key, val, 'EX', duration);
  }

  async del(key) {
    this.client.del(key);
  }
}
const redisClient = new RedisClient();
export default redisClient;
