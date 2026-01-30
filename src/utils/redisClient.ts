import { createClient } from 'redis';

const url = process.env.REDIS_URL;

const redisClient = createClient(
  url ? { url } : {}
);

//On Error
redisClient.on('error', (err) => console.error('Redis Client Error', err));

//Connexion 
async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('✅ Connected to Redis');
  }
}

export { redisClient, connectRedis };