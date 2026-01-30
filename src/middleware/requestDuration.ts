import { Request, Response } from 'express';

function requestDuration(rreq: Request, res: Response, next: any) {
  const start = process.hrtime.bigint(); // High-resolution time

  const originalEnd = res.end;

  res.end = function (...args: any) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    return originalEnd.apply(this, args);
  };

  next();
}

export default requestDuration;