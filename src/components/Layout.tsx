import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Typography, Drawer, App, Input } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserAddOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  AudioOutlined,
  UserOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Profile } from '../types';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout: React.FC = () => {
  const { message } = App.useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
  const [isFaculty, setIsFaculty] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getUser = async () => {
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

      if (profile) {
        setUser(profile);
        if (['Faculty', 'HOD', 'Principal'].includes(profile.title)) {
          setIsFaculty(true);
        }
      }
    };

    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    message.success('Logged out successfully');
    navigate('/login');
  };

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/users', icon: <TeamOutlined />, label: 'Staff Management' },
    { key: '/add-user', icon: <UserAddOutlined />, label: 'Register Staff' }
  ];

  if (isFaculty) {
    return (
      <Layout className="min-h-screen bg-gradient-to-br from-[#f7faff] to-[#eef4ff]">
        <Content><Outlet /></Content>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen bg-gradient-to-br from-[#f7faff] to-[#eef4ff]">

      {/* 🔵 SIDEBAR */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={280}
        className="hidden lg:block !fixed left-0 top-0 h-full z-20 !bg-white/20 backdrop-blur-[40px] border-r border-white/30 transition-all duration-500 shadow-2xl shadow-blue-900/5"
      >
        <div className="flex flex-col h-full">

          {/* Logo */}
          <div className="p-10 flex items-center gap-4">
            <div className="bg-blue-600/10 w-11 h-11 rounded-2xl flex items-center justify-center border border-blue-500/10 shadow-inner">
              <AudioOutlined className="text-blue-600 text-xl" />
            </div>
            {!collapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                <Title level={3} className="!m-0 !text-slate-900 !font-extrabold tracking-tighter">
                  VoiceLeave
                </Title>
                <Text className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em] -mt-1 block">University Admin</Text>
              </div>
            )}
          </div>

          {/* Menu */}
          <div className="flex-grow px-5 mt-4">
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              onClick={({ key }) => navigate(key)}
              className="bg-transparent border-none"
              items={menuItems.map(item => ({
                ...item,
                label: <span className="font-bold tracking-tight text-sm">{item.label}</span>,
                className: `!rounded-2xl mb-3 px-5 !h-14 flex items-center transition-all duration-500 ${
                  location.pathname === item.key
                    ? '!bg-white !text-blue-600 shadow-xl shadow-blue-500/10 scale-[1.02] border border-blue-100/50'
                    : '!text-slate-400 hover:!bg-white/40 hover:!text-slate-900 hover:scale-[1.01]'
                }`
              }))}
            />
          </div>

          {/* User Profile in Sidebar */}
          {!collapsed && (
            <div className="mx-6 mb-6 p-5 bg-white/40 border border-white/60 rounded-[2rem] shadow-sm transition-all duration-500 hover:bg-white/80 group">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar
                    size={48}
                    icon={<UserOutlined />}
                    src={user?.avatar_url}
                    className="bg-white text-blue-500 border-2 border-white shadow-sm transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>
                <div className="overflow-hidden">
                  <Text className="font-bold text-slate-900 text-sm block tracking-tight leading-none mb-1 truncate">
                    {user?.name || 'Admin'}
                  </Text>
                  <span className="text-[8px] bg-blue-500/10 text-blue-600 font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md leading-none inline-block">
                    {user?.title || 'REGISTRAR'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="px-6 pb-8">
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className={`w-full !h-14 !rounded-2xl !bg-slate-100/50 !text-slate-500 border-none hover:!bg-rose-500 hover:!text-white transition-all duration-500 font-bold shadow-sm active:scale-[0.95] flex items-center ${collapsed ? 'justify-center' : 'px-6'}`}
            >
              {!collapsed && 'Sign Out'}
            </Button>
          </div>
        </div>
      </Sider>

      {/* 🔵 MAIN */}
      <Layout className={`${collapsed ? 'lg:ml-20' : 'lg:ml-[280px]'} transition-all duration-500 bg-transparent`}>

        {/* 🔵 HEADER */}
        <Header
          className="bg-white/20 backdrop-blur-[50px] flex justify-between items-center px-8 lg:px-12 border-b border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.02)] sticky top-0 z-10 h-24"
        >
          <div className="flex items-center gap-6">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="!w-12 !h-12 flex items-center justify-center bg-white/40 border border-white/60 rounded-2xl shadow-sm hover:scale-110 transition-all text-slate-400"
            />
            <Title level={4} className="!m-0 !text-slate-900 !font-bold !tracking-tight">
              {menuItems.find(item => item.key === location.pathname)?.label || 'Overview'}
            </Title>
          </div>

          <div className="flex items-center gap-4">
             {/* Header is now cleaner without search/profile */}
          </div>
        </Header>

        {/* 🔵 CONTENT */}
        <Content className="p-6">
          <div className="max-w-7xl mx-auto bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/40 overflow-visible">
            <Outlet />
          </div>
        </Content>

      </Layout>

      {/* 🔵 MOBILE DRAWER */}
      <Drawer
        placement="left"
        open={mobileVisible}
        onClose={() => setMobileVisible(false)}
        styles={{
          body: {
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            padding: 0
          }
        }}
        extra={
          <div className="flex items-center space-x-2 mr-16">
               <div className="bg-blue-600/10 w-8 h-8 rounded-lg flex items-center justify-center border border-blue-500/10">
                  <AudioOutlined className="text-blue-600 text-lg" />
              </div>
              <span className="font-bold text-slate-800 tracking-tight">VoiceLeave</span>
          </div>
        }
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex-grow">
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              onClick={({ key }) => {
                navigate(key);
                setMobileVisible(false);
              }}
              items={menuItems.map(item => ({
                ...item,
                className: `!rounded-xl mb-2 !font-semibold ${
                  location.pathname === item.key 
                  ? '!bg-blue-600/10 !text-blue-600' 
                  : '!text-slate-500'
                }`
              }))}
              className="bg-transparent border-none"
            />
          </div>
          <div className="mt-auto">
            <Button 
                icon={<LogoutOutlined />} 
                onClick={handleLogout}
                className="w-full !rounded-xl !h-12 !border-none !bg-slate-100 !text-slate-500 font-bold active:scale-[0.98]"
            >
                Sign Out
            </Button>
          </div>
        </div>
      </Drawer>
    </Layout>
  );
};

export default MainLayout;