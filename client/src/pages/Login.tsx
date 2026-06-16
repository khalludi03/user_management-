/* important: Login page with email and password form.
 * Calls the AuthContext login function which POSTs to /login.
 * On success, navigates to the user management page. */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            /* note: login() throws ApiError on failure, caught below.
             * Success redirects to the user management table. */
            await login(email, password);
            navigate('/users');
        } catch (err: any) {
            /* nota bene: Display the server error message directly to the user.
             * Messages like "Invalid email or password" or
             * "Your account is blocked" come from the server. */
            setError(err.message || 'Login failed');
        }
    }

    return (
        <div className="container mt-5" style={{ maxWidth: 400 }}>
            <h2 className="mb-4">Sign In</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary w-100">Sign In</button>
            </form>
            <p className="mt-3 text-center">
                Don't have an account? <Link to="/register">Register</Link>
            </p>
        </div>
    );
}
