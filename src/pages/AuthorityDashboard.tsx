import React, { useState, useEffect } from 'react';
import { Card, Typography, Avatar, Spin, Button, message, Tabs, Tag, Badge } from 'antd';
import { 
    AudioOutlined, 
    LogoutOutlined,
    PlayCircleFilled,
    CheckCircleFilled,
    CloseCircleFilled,
    HistoryOutlined,
    ClockCircleOutlined,
    UserOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import type { Profile, LeaveApplication, LeaveApproval } from '../types';

const { Title, Text } = Typography;

const AuthorityDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<Profile | null>(null);
    const [myApps, setMyApps] = useState<LeaveApplication[]>([]);
    const [pendingReviews, setPendingReviews] = useState<LeaveApplication[]>([]);
    const [decisionHistory, setDecisionHistory] = useState<LeaveApproval[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [leaveType, setLeaveType] = useState('Casual');
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                navigate('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('uid', authUser.id)
                .single();
            
            setUser(profile);

            // 1. My Leaves
            const { data: apps } = await supabase
                .from('leave_applications')
                .select('*')
                .eq('faculty_id', authUser.id)
                .order('created_at', { ascending: false });
            setMyApps(apps || []);

            // 2. Review Pending (if Level 2 or 3)
            if (profile && (profile.title === 'HOD' || profile.title === 'Principal')) {
                const level = profile.title === 'HOD' ? 2 : 3;
                let query = supabase
                    .from('leave_applications')
                    .select('*, faculty:users!faculty_id(*)')
                    .eq('current_level', level)
                    .eq('status', 'pending');
                
                if (level === 2) {
                    query = query.eq('faculty.dept', profile.dept);
                }

                const { data: pending } = await query;
                setPendingReviews(pending || []);

                // 3. Decision History
                const { data: history } = await supabase
                    .from('leave_approvals')
                    .select('*, leave_applications(*, faculty:users!faculty_id(*))')
                    .eq('decision_by', authUser.id)
                    .order('decision_at', { ascending: false });
                setDecisionHistory(history || []);
            }

        } catch (error: unknown) {
            console.error('Error fetching data:', error);
            message.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (appId: number, isApproved: boolean) => {
        try {
            const status = isApproved ? 'approved' : 'rejected';
            const decision = isApproved ? 'granted' : 'rejected';

            const { error: appError } = await supabase
                .from('leave_applications')
                .update({ status: status })
                .eq('id', appId);
            
            if (appError) throw appError;

            const { error: logError } = await supabase
                .from('leave_approvals')
                .insert({
                    id: appId,
                    decision_by: user?.uid,
                    decision: decision,
                    leave_type: 'Casual',
                    role: user?.title === 'HOD' ? 2 : 3
                });
            
            if (logError) throw logError;

            message.success(`Application ${status} successfully`);
            fetchData();
        } catch (error) {
            console.error('Error processing decision:', error);
            message.error('Action failed');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };
    
    const handleToggleRecording = async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                const chunks: Blob[] = [];

                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = async () => {
                    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                    setRecordedBlob(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };

                recorder.start();
                setMediaRecorder(recorder);
                setIsRecording(true);
                setRecordedBlob(null);
                message.loading({ content: 'Listening...', key: 'recording', duration: 0 });
            } catch (err) {
                console.error('Microphone error:', err);
                message.error('Could not access microphone');
            }
        } else {
            mediaRecorder?.stop();
            setIsRecording(false);
            message.destroy('recording');
        }
    };

    const handleConfirmSubmit = async () => {
        if (!recordedBlob) return;
        await handleUploadAudio(recordedBlob);
        setRecordedBlob(null);
    };

    const handleUploadAudio = async (blob: Blob) => {
        const hide = message.loading('Processing leave request...', 0);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session');

            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${apiUrl}/user/apply-leave`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed. Is the server running?');
            const result = await response.json();

            const title = user?.title?.toLowerCase().trim() || 'faculty';
            let startingLevel = 2; 
            if (title === 'hod') startingLevel = 3; 
            else if (title === 'principal') startingLevel = 4; 
            else if (title === 'registrar') startingLevel = 100; 

            const { error: insertError } = await supabase
                .from('leave_applications')
                .insert({
                    faculty_id: user?.uid,
                    leave_type: leaveType,
                    status: 'pending',
                    current_level: startingLevel,
                    voice_blob_name: result.fileName
                });

            if (insertError) throw insertError;

            message.success(`${leaveType} Leave application submitted!`);
            fetchData();
        } catch (err: any) {
            console.error('Upload error details:', err);
            message.error(err.message || 'Failed to submit leave request.');
        } finally {
            hide();
        }
    };

    const handlePlayAudio = async (blobName: string) => {
        if (!blobName) {
            message.warning('No audio file found for this request');
            return;
        }

        const hide = message.loading('Fetching audio...', 0);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            
            const response = await fetch(`${apiUrl}/user/get-sas-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ blobName })
            });

            if (!response.ok) throw new Error('Failed to get audio URL');
            const { sasUrl } = await response.json();

            setCurrentlyPlaying(blobName);
            const audio = new Audio(sasUrl);
            audio.play();
            audio.onended = () => setCurrentlyPlaying(null);
            audio.onerror = () => {
                setCurrentlyPlaying(null);
                message.error('Error playing audio');
            };
        } catch (err) {
            console.error('Playback error:', err);
            message.error('Could not play audio. Is the server running?');
        } finally {
            hide();
        }
    };

    const getStatusTag = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'approved' || s === 'granted') return (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100/50">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FE]"><Spin size="large" /></div>;

    const items = [
        {
            key: '1',
            label: (
                <span className="flex items-center space-x-2 px-2">
                    <UserOutlined />
                    <span className="font-bold">My Leaves</span>
                </span>
            ),
            children: (
                <div className="grid gap-4 pt-2">
                    <AnimatePresence mode="popLayout">
                        {myApps.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                    <HistoryOutlined className="text-2xl text-slate-300" />
                                </div>
                                <Text className="text-slate-400 font-medium tracking-tight">No leave requests found yet.</Text>
                            </div>
                        ) : (
                            myApps.map((app, index) => (
                                <motion.div
                                    key={app.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -2 }}
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md hover:border-brand/20 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${currentlyPlaying === app.voice_blob_name ? 'bg-brand scale-110 shadow-lg shadow-brand/20' : 'bg-slate-50 group-hover:bg-brand-light'}`}>
                                            <AudioOutlined className={`text-xl transition-colors duration-300 ${currentlyPlaying === app.voice_blob_name ? 'text-white' : 'text-brand group-hover:text-brand'}`} />
                                        </div>
                                        <div>
                                            <Text className="block font-bold text-slate-800 text-base tracking-tight capitalize">{app.leave_type} Leave</Text>
                                            <div className="flex items-center mt-1 space-x-3">
                                                <Text className="text-[11px] text-slate-400 font-medium">
                                                    {new Date(app.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                </Text>
                                                {getStatusTag(app.status)}
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        type="text" 
                                        onClick={(e) => { e.stopPropagation(); handlePlayAudio(app.voice_blob_name); }}
                                        icon={<PlayCircleFilled className={`text-4xl transition-all ${currentlyPlaying === app.voice_blob_name ? 'text-brand' : 'text-brand/40 group-hover:text-brand'}`} />}
                                        className="p-0 h-auto flex items-center justify-center hover:bg-transparent"
                                    />
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            )
        },
        ...(user?.title === 'HOD' || user?.title === 'Principal' ? [
            {
                key: '2',
                label: (
                    <span className="flex items-center space-x-2 px-2">
                        <ClockCircleOutlined />
                        <span className="font-bold">Review Pending</span>
                        {pendingReviews.length > 0 && (
                            <Badge 
                                count={pendingReviews.length} 
                                className="ml-1" 
                                styles={{
                                    indicator: {
                                        backgroundColor: '#3b82f6',
                                        boxShadow: '0 0 0 2px #fff',
                                        fontSize: '10px',
                                        fontWeight: '800'
                                    }
                                }}
                            />
                        )}
                    </span>
                ),
                children: (
                <div className="grid gap-6 pt-2">
                   <AnimatePresence mode="popLayout">
                    {pendingReviews.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                <CheckCircleFilled className="text-2xl text-emerald-300" />
                            </div>
                            <Text className="text-slate-400 font-medium tracking-tight">Clear history. All requests have been reviewed.</Text>
                        </div>
                    ) : (
                        pendingReviews.map((app, index) => (
                            <motion.div
                                key={app.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500 overflow-hidden group">
                                    <div className="flex flex-col space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="relative">
                                                    <Avatar size={56} className="bg-brand text-white font-bold text-lg border-2 border-white shadow-sm">
                                                        {(app.faculty?.name || 'U')[0]}
                                                    </Avatar>
                                                </div>
                                                <div>
                                                    <Text className="block font-bold text-slate-800 text-lg leading-none">{app.faculty?.name || 'Unknown'}</Text>
                                                    <div className="flex items-center mt-1.5 space-x-2">
                                                        <span className="text-[10px] text-brand font-bold uppercase tracking-wider bg-brand-light px-2 py-0.5 rounded-md">{app.faculty?.title}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{app.faculty?.dept}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                shape="circle"
                                                onClick={() => handlePlayAudio(app.voice_blob_name)}
                                                icon={<PlayCircleFilled className="text-2xl" />}
                                                className="h-12 w-12 bg-brand-light text-brand border-none hover:scale-105 transition-all flex items-center justify-center p-0"
                                            />
                                        </div>
                                        
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                            <div>
                                                <Text className="block font-bold text-slate-400 uppercase text-[9px] tracking-widest mb-0.5">Leave Type</Text>
                                                <Text className="text-slate-800 font-bold text-sm">{app.leave_type || 'Casual'} Leave</Text>
                                            </div>
                                            <div className="text-right">
                                                <Text className="block font-bold text-slate-400 uppercase text-[9px] tracking-widest mb-0.5">Submitted</Text>
                                                <Text className="text-slate-500 text-[11px] font-medium">
                                                    {new Date(app.created_at).toLocaleDateString()}
                                                </Text>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button 
                                                danger 
                                                icon={<CloseCircleFilled />} 
                                                onClick={() => handleDecision(app.id, false)}
                                                className="h-12 flex-1 rounded-xl font-bold text-xs uppercase tracking-wider border-none bg-rose-50 text-rose-500 hover:bg-rose-100"
                                            >
                                                Reject
                                            </Button>
                                            <Button 
                                                type="primary" 
                                                icon={<CheckCircleFilled />} 
                                                onClick={() => handleDecision(app.id, true)}
                                                className="h-12 flex-2 rounded-xl bg-brand border-none font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand/20"
                                            >
                                                Approve Request
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                   </AnimatePresence>
                </div>
            )
            },
            {
                key: '3',
                label: (
                    <span className="flex items-center space-x-2 px-2">
                        <HistoryOutlined />
                        <span className="font-bold">Decision History</span>
                    </span>
                ),
                children: (
                <div className="grid gap-4 pt-2">
                    <AnimatePresence mode="popLayout">
                        {decisionHistory.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                    <HistoryOutlined className="text-2xl text-slate-300" />
                                </div>
                                <Text className="text-slate-400 font-medium tracking-tight">No decision history available.</Text>
                            </div>
                        ) : (
                            decisionHistory.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${item.decision === 'Approved' || item.decision === 'granted' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                            {item.decision === 'Approved' || item.decision === 'granted' ? 
                                                <CheckCircleFilled className="text-emerald-500 text-xl" /> : 
                                                <CloseCircleFilled className="text-rose-500 text-xl" />
                                            }
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <Text className="block font-bold text-slate-800 text-base tracking-tight leading-none">
                                                    {item.leave_applications?.faculty?.name || 'Faculty Request'}
                                                </Text>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${item.decision === 'Approved' || item.decision === 'granted' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {item.decision}
                                                </span>
                                            </div>
                                            <Text className="text-[11px] text-slate-400 font-medium mt-1 block">
                                                {item.leave_applications?.leave_type || 'Casual'} Leave • {new Date(item.decision_at).toLocaleDateString()}
                                            </Text>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button 
                                            type="text"
                                            onClick={() => handlePlayAudio(item.leave_applications?.voice_blob_name)}
                                            icon={<PlayCircleFilled className="text-3xl text-brand/30 group-hover:text-brand transition-colors" />}
                                            className="flex items-center justify-center hover:bg-transparent"
                                        />
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            )
            }
        ] : [])
    ];

    return (
        <div className="min-h-screen bg-transparent pb-20 animate-in fade-in duration-1000">
            {/* 🔵 HEADER (Apple Style) */}
            <header className="sticky top-0 z-50 bg-white/30 backdrop-blur-[40px] border-b border-white/40 px-8 py-5 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-center space-x-6">
                    <div className="relative group cursor-pointer">
                        <Avatar 
                            size={52} 
                            className="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 font-bold text-xl border-2 border-white shadow-md transition-transform duration-500 group-hover:scale-110"
                            src={user?.avatar_url}
                        >
                            {(user?.name || '?')[0]}
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                    <div>
                        <Title level={4} className="!m-0 !text-slate-900 !font-extrabold !leading-tight !tracking-tight">
                            {user?.name || 'Faculty Member'}
                        </Title>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-blue-500 text-white font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md leading-none">
                                {user?.title || 'FACULTY'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-l border-slate-200 pl-2">
                                {user?.dept || 'DEPARTMENT'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button 
                        type="text" 
                        icon={<LogoutOutlined className="text-xl" />} 
                        onClick={handleLogout}
                        className="!w-12 !h-12 flex items-center justify-center !text-slate-400 hover:!bg-rose-50 hover:!text-rose-500 hover:!border-rose-100 border border-transparent rounded-2xl transition-all duration-300 group"
                    />
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-6 mt-12 pb-10">
                {/* 🎤 REQUEST LEAVE CARD */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-white p-1 relative overflow-hidden group/card">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl group-hover/card:bg-blue-400/10 transition-colors duration-1000"></div>
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl group-hover/card:bg-emerald-400/10 transition-colors duration-1000"></div>
                        
                        <div className="flex flex-col items-center py-16 space-y-10 relative z-10">
                            <div className="text-center space-y-2 px-8">
                                <Title level={2} className="!m-0 !text-slate-900 !font-black !tracking-tighter">
                                    {isRecording ? 'Listening...' : recordedBlob ? 'Final Step' : 'Request Leave'}
                                </Title>
                                <Text className="text-slate-400 font-semibold text-base block tracking-tight">
                                    {isRecording 
                                        ? 'Capturing your voice message' 
                                        : recordedBlob 
                                            ? 'Select leave type and confirm' 
                                            : 'Speak naturally to apply for leave instantly'}
                                </Text>
                            </div>
                            
                            <div className="relative">
                                {!recordedBlob ? (
                                    <>
                                        <AnimatePresence>
                                            {isRecording && (
                                                <>
                                                    <motion.div 
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1.5, opacity: 0.15 }}
                                                        exit={{ scale: 0.8, opacity: 0 }}
                                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                                        className="absolute inset-0 bg-rose-500 rounded-full blur-2xl"
                                                    />
                                                </>
                                            )}
                                        </AnimatePresence>
                                        
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="relative z-20"
                                        >
                                            <Button 
                                                type="primary" 
                                                shape="circle" 
                                                icon={isRecording ? <div className="w-6 h-6 bg-white rounded-md animate-pulse" /> : <AudioOutlined className="text-5xl" />}
                                                onClick={handleToggleRecording}
                                                className={`h-40 w-40 border-4 border-white shadow-2xl flex items-center justify-center transition-all duration-700 ${
                                                    isRecording 
                                                    ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/40' 
                                                    : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/40'
                                                }`}
                                            />
                                        </motion.div>
                                    </>
                                ) : (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center gap-8 w-full px-12"
                                    >
                                        <div className="flex flex-wrap justify-center gap-3">
                                            {['Casual', 'Medical', 'Vacation'].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => setLeaveType(type)}
                                                    className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-500 border-2 ${
                                                        leaveType === type 
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                                        : 'bg-white/80 border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-500'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex gap-4 w-full max-w-xs">
                                            <Button 
                                                className="h-14 flex-1 !rounded-2xl !font-bold !text-slate-400 !border-slate-100 hover:!bg-slate-50"
                                                onClick={() => setRecordedBlob(null)}
                                            >
                                                Discard
                                            </Button>
                                            <Button 
                                                type="primary"
                                                className="h-14 flex-[2] !rounded-2xl !font-black !bg-blue-600 !border-none shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                                onClick={handleConfirmSubmit}
                                            >
                                                Confirm Submit
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {!recordedBlob && (
                                <div className="flex flex-col items-center gap-2">
                                    <span className={`font-black text-xs uppercase tracking-[0.25em] transition-all duration-500 ${isRecording ? 'text-rose-500 scale-110' : 'text-slate-300'}`}>
                                        {isRecording ? 'TAP TO SUBMIT' : 'TAP TO RECORD'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* 📋 LIST SECTION */}
                <div className="mt-16">
                    <Tabs 
                        defaultActiveKey="1" 
                        items={items} 
                        className="apple-tabs"
                        centered
                    />
                </div>
            </div>

            <style>{`
                .apple-tabs .ant-tabs-nav {
                    border-bottom: none !important;
                    margin-bottom: 40px !important;
                }
                
                .apple-tabs .ant-tabs-tab {
                    padding: 12px 24px !important;
                    margin: 0 8px !important;
                    border-radius: 20px !important;
                    background: rgba(255, 255, 255, 0.4) !important;
                    border: 1px border-white/40 !important;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    backdrop-filter: blur(10px);
                }

                .apple-tabs .ant-tabs-tab:hover {
                    background: rgba(255, 255, 255, 0.8) !important;
                    color: #2563eb !important;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
                }
                
                .apple-tabs .ant-tabs-tab-active {
                    background: white !important;
                    box-shadow: 0 15px 35px -10px rgba(59, 130, 246, 0.15) !important;
                }
                
                .apple-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
                    color: #2563eb !important;
                    font-weight: 800 !important;
                    letter-spacing: -0.02em;
                }
                
                .apple-tabs .ant-tabs-ink-bar {
                    display: none !important;
                }

                .ant-spin-dot-item {
                    background-color: #3b82f6 !important;
                }
            `}</style>
        </div>
    );
};

export default AuthorityDashboard;
