import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="backdrop-blur-md bg-white/5 border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
                            Project Galaxy
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                                <img
                                    src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.username}&background=6366f1&color=fff`}
                                    alt="Avatar"
                                    className="w-8 h-8 rounded-full ring-2 ring-purple-400"
                                />
                                <span className="font-medium text-white">{user?.username}</span>
                            </div>
                            <button
                                onClick={logout}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all duration-200 hover:scale-105"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Welcome Section */}
                <div className="mb-12">
                    <h2 className="text-4xl font-bold text-white mb-2">
                        Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">{user?.username}</span>
                    </h2>
                    <p className="text-slate-300">Ready to explore the virtual workspace?</p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Workspace Card */}
                    <Link to="/workspace" className="group relative overflow-hidden backdrop-blur-xl bg-white/10 p-6 rounded-2xl border border-white/20 hover:border-purple-400/50 transition-all duration-300 cursor-pointer hover:scale-105">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl">🚀</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">Launch Workspace</h3>
                            <p className="text-slate-300 text-sm">Enter the virtual office and collaborate with your team in real-time.</p>
                        </div>
                    </Link>

                    {/* Chat Card */}
                    <div className="group relative overflow-hidden backdrop-blur-xl bg-white/10 p-6 rounded-2xl border border-white/20 hover:border-indigo-400/50 transition-all duration-300 cursor-pointer hover:scale-105">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl">💬</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">Chat Channels</h3>
                            <p className="text-slate-300 text-sm">Check your messages and stay connected with team updates.</p>
                        </div>
                    </div>

                    {/* Voice Card */}
                    <div className="group relative overflow-hidden backdrop-blur-xl bg-white/10 p-6 rounded-2xl border border-white/20 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer hover:scale-105">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <span className="text-2xl">🎙️</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">Voice Channels</h3>
                            <p className="text-slate-300 text-sm">Join voice channels with spatial audio for immersive communication.</p>
                        </div>
                    </div>
                </div>

                {/* Status Section */}
                <div className="mt-12 backdrop-blur-xl bg-white/5 p-6 rounded-2xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">0</div>
                            <div className="text-sm text-slate-400 mt-1">Active Users</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">0</div>
                            <div className="text-sm text-slate-400 mt-1">Messages Today</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">0</div>
                            <div className="text-sm text-slate-400 mt-1">Voice Channels</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HomePage;
