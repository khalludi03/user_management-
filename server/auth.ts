/* important: Authentication utilities for password hashing and JWT generation.
 * Uses argon2 for password hashing (stronger than bcrypt) and jsonwebtoken for session tokens. */
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

/* nota bene: Argon2 is the recommended password hashing algorithm.
 * It is memory-hard and resistant to GPU/ASIC attacks. */
export async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
}

export async function verifyPassword(hash:string, password: string): Promise<boolean> {
    return await argon2.verify(hash,password);
}

/* note: Generates a JWT token that expires in 24 hours.
 * The token contains the user ID for session identification. */
export function generateJWT(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '24h' });
}
