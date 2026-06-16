/* important: Application root with route definitions.
 * ProtectedRoute blocks unauthenticated users from accessing /users.
 * PublicRoute redirects authenticated users away from login/register. */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import UserManagement from './pages/UserManagement';
import type { ReactNode } from 'react';

/* note: Redirects to /login if the user has no valid session. */
function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, token } = useAuth();
    if (!user || !token) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

/* nota bene: If already authenticated, skip login/register and go to /users. */
function PublicRoute({ children }: { children: ReactNode }) {
    const { user, token } = useAuth();
    if (user && token) return <Navigate to="/users" replace />;
    return <>{children}</>;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                    <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
