import React from 'react';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-dark text-white p-8">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                    Project Galaxy
                </h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <img
                            src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}`}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full border-2 border-primary"
                        />
                        <span className="font-medium">{user?.username}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md transition"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-dark-lighter p-6 rounded-xl border border-slate-700 hover:border-primary transition cursor-pointer group">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition">🚀 Launch Workspace</h3>
                    <p className="text-slate-400">Enter the virtual office and collaborate with your team.</p>
                </div>

                <div className="bg-dark-lighter p-6 rounded-xl border border-slate-700 hover:border-secondary transition cursor-pointer group">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-secondary transition">💬 Chat Channels</h3>
                    <p className="text-slate-400">Check your messages and team updates.</p>
                </div>
            </main>
        </div>
    );
};

export default HomePage;
