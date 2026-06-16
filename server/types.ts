/* important: Shared type definitions for Express middleware.
 * nota bene: The Middleware type ensures consistent typing across all middleware functions. */
import type { NextFunction, Request, Response } from 'express';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

export type { Middleware };
