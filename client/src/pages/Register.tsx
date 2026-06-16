/* important: Registration page with name, email, and password fields.
 * On success, displays a message telling the user to check their email for verification.
 * nota bene: The user is registered immediately — no email verification is required
 * to create the account. The verification email is sent asynchronously. */
import { useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const data = await api('/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password }),
            });
            /* note: Show the email address used so the user knows where to check. */
            setMessage(`Registration successful! Check your email (${data.user.email}) to verify your account.`);
            setName('');
            setEmail('');
            setPassword('');
        } catch (err: any) {
            /* nota bene: The server catches DB unique index violations (23505)
             * and returns "Email already registered" — no manual email check here. */
            setError(err.message || 'Registration failed');
        }
    }

    return (
        <div className="container mt-5" style={{ maxWidth: 400 }}>
            <h2 className="mb-4">Register</h2>
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary w-100">Register</button>
            </form>
            <p className="mt-3 text-center">
                Already have an account? <Link to="/login">Sign In</Link>
            </p>
        </div>
    );
}
