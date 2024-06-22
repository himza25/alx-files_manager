import { expect } from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import app from '../server'; // assuming server.js exports the express app
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

chai.use(chaiHttp);

describe('API Endpoints', () => {
  before(async () => {
    await dbClient.db.collection('users').deleteMany({});
    await dbClient.db.collection('files').deleteMany({});
  });

  describe('GET /status', () => {
    it('should return status', (done) => {
      chai.request(app)
        .get('/status')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('redis');
          expect(res.body).to.have.property('db');
          done();
        });
    });
  });

  describe('GET /stats', () => {
    it('should return stats', (done) => {
      chai.request(app)
        .get('/stats')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('users');
          expect(res.body).to.have.property('files');
          done();
        });
    });
  });
});
