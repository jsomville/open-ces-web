import { Request, Response } from 'express';

import redisHelper from '../utils/redisHelper.js'

const windowsMS = 60000; // in ms
const limit = 15; // number of requests

const asyncHandler = (fn: (req: Request, res: Response, next: any) => any) =>
  (req: Request, res: Response, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const rate_limiter_by_ip = asyncHandler(async (req: Request, res: Response, next:any) => {
  if (!process.env.IS_TESTING) {

    const key = "RateLimit:" + req.ip;

    const remaining = await rate_limiter_by_key(key, res);

    // check limit & send error
    if (remaining <= 0) {
      const error = new Error('Too many requests');
      (error as any).status = 429;
      next(error);
    }
    else {
      next();
    }
  }
  else {
    next();
  }
});

async function rate_limiter_by_key(key: string, res: Response) {
  const now = Date.now();

  const raw = await redisHelper.get(key);
  let callsHistory = raw ? JSON.parse(raw) : [];

  if (callsHistory) {
    // remove expired timestamps
    const cutoff = now - windowsMS;
    while (callsHistory.length && callsHistory[0] < cutoff) {
      callsHistory.shift();
    }
  }

  //push current date/time
  callsHistory.push(now);

  //Update limit in cache
  const ttlSeconds = Math.ceil(windowsMS / 1000);
  await redisHelper.set(key, JSON.stringify(callsHistory), ttlSeconds);

  const remaining = Math.max(limit - callsHistory.length, 0);

  // Update response header for remaining rate limit
  res.set('X-RateLimit-Remaining', String(remaining));
  res.set('X-RateLimit-Limit', String(limit));

  return remaining;
};