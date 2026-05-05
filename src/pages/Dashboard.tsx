import React, { useState, useEffect } from 'react';
import { Typography, Avatar, Spin, Button } from 'antd';
import { 
    TeamOutlined, 
    FileTextOutlined, 
    ArrowRightOutlined
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import AuthorityDashboard from './AuthorityDashboard';
import type { LeaveApplication } from '../types';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ users: 0, applications: 0 });
    const [recentApps, setRecentApps] = useState<LeaveApplication[]>([]);
    const [isFaculty, setIsFaculty] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Stats
            const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const { count: appCount } = await supabase.from('leave_applications').select('*', { count: 'exact', head: true });
            
            setStats({ users: userCount || 0, applications: appCount || 0 });

            // Check Role
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('title')
                    .eq('uid', authUser.id)
                    .single();
                
                if (profile?.title === 'Faculty' || profile?.title === 'HOD' || profile?.title === 'Principal') {
                    setIsFaculty(true);
                    return; // Don't fetch admin stats if faculty/authority
                }
            }

            // Fetch Recent Activity
            const { data: apps } = await supabase
                .from('leave_applications')
                .select('*, faculty:users!faculty_id(*)')
                .order('created_at', { ascending: false })
                .limit(5);
            
            setRecentApps(apps || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusTag = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'approved') return (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100/50">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span className="text-emerald-700 font-bold text-[10px] uppercase tracking-wider">Approved</span>
            </div>
        );
        if (s === 'rejected') return (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100/50">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                <span className="text-rose-700 font-bold text-[10px] uppercase tracking-wider">Rejected</span>
            </div>
        );
        return (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-100/50">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span className="text-amber-700 font-bold text-[10px] uppercase tracking-wider">Pending</span>
            </div>
        );
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-bg"><Spin size="large" /></div>;

    if (isFaculty) return <AuthorityDashboard />;

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10 animate-in slide-up duration-700">
            <header className="flex flex-col space-y-2">
                <Title level={2} className="!m-0 !text-slate-900 !font-bold !tracking-tight">System Overview</Title>
                <Text className="text-slate-400 font-medium tracking-tight">Real-time statistics and recent activity logs</Text>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-[#e0ecff] to-[#f0f6ff] rounded-[2.5rem] p-10 shadow-xl shadow-blue-500/5 border border-white group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
                    <div className="absolute -top-10 -right-10 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-700 rotate-12">
                        <TeamOutlined className="text-[200px] text-blue-600" />
                    </div>
                    <div className="relative z-10 flex flex-col space-y-6">
                        <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-lg shadow-blue-500/5 transition-transform duration-500 group-hover:scale-110">
                            <TeamOutlined className="text-blue-500 text-3xl" />
                        </div>
                        <div>
                            <Text className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Total Staff Members</Text>
                            <Title level={1} className="!m-0 !text-slate-900 !font-bold !tracking-tighter !text-5xl mt-1">{stats.users}</Title>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#e0f2fe] to-[#f0f9ff] rounded-[2.5rem] p-10 shadow-xl shadow-blue-500/5 border border-white group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
                    <div className="absolute -top-10 -right-10 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-700 rotate-12">
                        <FileTextOutlined className="text-[200px] text-blue-400" />
                    </div>
                    <div className="relative z-10 flex flex-col space-y-6">
                        <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-lg shadow-blue-500/5 transition-transform duration-500 group-hover:scale-110">
                            <FileTextOutlined className="text-blue-400 text-3xl" />
                        </div>
                        <div>
                            <Text className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Total Applications</Text>
                            <Title level={1} className="!m-0 !text-slate-900 !font-bold !tracking-tighter !text-5xl mt-1">{stats.applications}</Title>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden transition-all duration-500">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <Title level={4} className="!m-0 !text-slate-900 !font-bold !tracking-tight">Recent Activity</Title>
                        <Text className="text-slate-400 text-xs font-medium tracking-tight">Latest leave requests from across the university</Text>
                    </div>
                    <Button type="text" className="text-blue-600 font-bold flex items-center hover:bg-blue-50 rounded-xl h-12 px-6 transition-all active:scale-[0.98]">
                        View All <ArrowRightOutlined className="ml-2 text-xs" />
                    </Button>
                </div>
                <div className="p-6 space-y-4">
                    {recentApps.map((app) => (
                        <div 
                            key={app.id} 
                            className="p-6 rounded-[2rem] hover:bg-slate-50/50 transition-all duration-300 cursor-pointer group border border-transparent hover:border-slate-100"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-5">
                                    <div className="relative">
                                        <Avatar 
                                            size={56} 
                                            className="bg-blue-50 !text-blue-600 font-bold border-2 border-white shadow-sm transition-transform duration-300 group-hover:scale-110"
                                        >
                                            {(app.faculty?.name || '?')[0]}
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <Text className="text-base font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">{app.faculty?.name || 'Unknown'}</Text>
                                            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">#{app.id}</span>
                                        </div>
                                        <Text className="text-slate-400 font-medium text-xs block tracking-tight mt-0.5">
                                            {app.leave_type} Leave • {app.is_half_day ? 'Half Day' : 'Full Day'}
                                        </Text>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end space-y-3">
                                    <Text className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                        {new Date(app.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    </Text>
                                    {getStatusTag(app.status)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};



export default Dashboard;
