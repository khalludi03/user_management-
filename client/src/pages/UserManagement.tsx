/* important: User Management page with sortable table, checkbox selection,
 * toolbar actions (Block, Unblock, Delete, Delete Unverified), activity sparklines,
 * and a standard navigation header with logout.
 * nota bene: All toolbar actions require selected users except Delete Unverified
 * which deletes all unverified users at once. */
import { useEffect, useState, useMemo } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface User {
    id: string;
    name: string;
    email: string;
    status: string;
    last_login_at: string | null;
    created_at: string;
    sparkline: number[];
}

type SortKey = 'name' | 'email' | 'status' | 'last_login_at' | 'created_at';
type SortDir = 'asc' | 'desc';

/* note: Inline SVG sparkline bar chart showing daily activity over the last 7 days.
 * Each bar represents one day; height is proportional to the count. */
function Sparkline({ data }: { data: number[] }) {
    const w = 60;
    const h = 20;
    const max = Math.max(...data, 1);
    const barW = w / 7;
    return (
        <svg width={w} height={h} className="d-block">
            {data.map((val, i) => (
                <rect
                    key={i}
                    x={i * barW + 1}
                    y={h - (val / max) * h}
                    width={barW - 2}
                    height={(val / max) * h}
                    fill="#0d6efd"
                    rx={1}
                />
            ))}
        </svg>
    );
}

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sortKey, setSortKey] = useState<SortKey>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filter, setFilter] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // note: Fetch users on component mount.
    useEffect(() => {
        fetchUsers();
    }, []);

    /* note: Fetches the user list from the server.
     * If the current user is blocked/deleted (403), redirects to login. */
    async function fetchUsers() {
        try {
            const data = await api('/api/users');
            setUsers(data);
        } catch (err: any) {
            if (err instanceof ApiError && err.status === 403) {
                logout();
                navigate('/login');
            } else {
                setError('Failed to load users');
            }
        }
    }

    /* nota bene: Client-side filtering and sorting using useMemo.
     * Sorts by string comparison of the selected column value.
     * Filters by name or email (case-insensitive) when the search bar is used. */
    const sortedUsers = useMemo(() => {
        const q = filter.toLowerCase().trim();
        const filtered = q ? users.filter(u =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        ) : users;
        const sorted = [...filtered].sort((a, b) => {
            const aVal = a[sortKey] || '';
            const bVal = b[sortKey] || '';
            const cmp = String(aVal).localeCompare(String(bVal));
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [users, sortKey, sortDir, filter]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }

    /* note: Toggle a single user's checkbox. */
    function toggleSelect(id: string) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    /* important: Select/deselect all rows via the header checkbox. */
    function toggleSelectAll() {
        if (selected.size === sortedUsers.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(sortedUsers.map(u => u.id)));
        }
    }

    /* important: Execute a toolbar action.
     * Each action maps to a specific API call.
     * If the server returns 403 (blocked/deleted user), redirect to login. */
    async function handleAction(action: string) {
        setError('');
        setSuccess('');
        try {
            const ids = Array.from(selected);
            if (action === 'block') {
                await api('/api/users/block', { method: 'PATCH', body: JSON.stringify({ ids }) });
            } else if (action === 'unblock') {
                await api('/api/users/unblock', { method: 'PATCH', body: JSON.stringify({ ids }) });
            } else if (action === 'delete') {
                await api('/api/users', { method: 'DELETE', body: JSON.stringify({ ids }) });
            } else if (action === 'delete-unverified') {
                // nota bene: No selection needed — deletes ALL unverified users.
                await api('/api/users/unverified', { method: 'DELETE' });
            } else {
                return;
            }
            setSuccess('Action completed successfully');
            setSelected(new Set());
            fetchUsers();
        } catch (err: any) {
            if (err instanceof ApiError && err.status === 403) {
                logout();
                navigate('/login');
            } else {
                setError(err.message || 'Action failed');
            }
        }
    }

    function timeAgo(d: string | null) {
        if (!d) return null;
        const now = Date.now();
        const diff = now - new Date(d).getTime();
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return 'less than a minute ago';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
        const years = Math.floor(days / 365);
        return `${years} year${years === 1 ? '' : 's'} ago`;
    }

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <span className="ms-1 text-muted">↕</span>;
        return <span className="ms-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="container-fluid py-4">
            {/* important: Standard navigation header with branding and logout. */}
            <nav className="navbar navbar-expand navbar-light bg-light rounded-3 mb-4 px-3 shadow-sm">
                <div className="container-fluid">
                    <span className="navbar-brand fw-semibold">User Management</span>
                    <div className="d-flex align-items-center gap-3">
                        <span className="text-muted small">{user?.name}</span>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => { logout(); navigate('/login'); }}>
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* important: Toolbar — always visible above the table.
             * Block (text), Unblock (icon), Delete (icon), Delete Unverified (icon).
             * Buttons are enabled/disabled based on selection state.
             * Search input is aligned on the right side of the toolbar row. */}
            <div className="d-flex gap-2 mb-3 align-items-center">
                <button className="btn btn-warning" disabled={selected.size === 0} onClick={() => handleAction('block')} title="Block selected users">
                    Block
                </button>
                <button className="btn btn-success" disabled={selected.size === 0} onClick={() => handleAction('unblock')} title="Unblock selected users">
                    🔓
                </button>
                <button className="btn btn-danger" disabled={selected.size === 0} onClick={() => handleAction('delete')} title="Delete selected users">
                    🗑️
                </button>
                <button className="btn btn-outline-danger" onClick={() => handleAction('delete-unverified')} title="Delete all unverified users">
                    ❌
                </button>
                <div className="ms-auto" style={{ width: 260 }}>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Search by name or email..."
                        value={filter}
                        onChange={e => { setFilter(e.target.value); setSelected(new Set()); }}
                    />
                </div>
            </div>

            {/* note: Sortable table with checkbox, sparkline, and required columns. */}
            <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle">
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: 40 }}>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={selected.size === sortedUsers.length && sortedUsers.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th role="button" onClick={() => toggleSort('name')}>
                                Name <SortIcon col="name" />
                            </th>
                            <th role="button" onClick={() => toggleSort('email')}>
                                Email <SortIcon col="email" />
                            </th>
                            <th role="button" onClick={() => toggleSort('last_login_at')}>
                                Last Seen <SortIcon col="last_login_at" />
                            </th>
                            <th role="button" onClick={() => toggleSort('status')}>
                                Status <SortIcon col="status" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map(u => (
                            <tr key={u.id} className={selected.has(u.id) ? 'table-active' : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selected.has(u.id)}
                                        onChange={() => toggleSelect(u.id)}
                                    />
                                </td>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td title={u.last_login_at ? new Date(u.last_login_at).toLocaleString() : ''}>
                                    <div>{timeAgo(u.last_login_at) || '—'}</div>
                                    <div className="mt-1"><Sparkline data={u.sparkline} /></div>
                                </td>
                                <td>
                                    <span className={`badge ${u.status === 'active' ? 'bg-success' : u.status === 'blocked' ? 'bg-danger' : 'bg-secondary'}`}>
                                        {u.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {sortedUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-4">No users found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
