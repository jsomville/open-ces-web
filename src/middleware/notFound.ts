import { Request, Response } from 'express';

const notFound = (req: Request, res: Response, next: any) => {
    const error = new Error('URL not Found');
    (error as any).status = 404;

    next(error);
};

export default notFound;