import React, { useState } from 'react';
import { Form, Input, Button, Typography, Select, message, Radio } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined, UserAddOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';

const { Title, Text } = Typography;

const AddUser: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const containerRef = React.useRef<HTMLDivElement>(null);

    const departments = ['CSE', 'ECE', 'IT', 'MECH', 'CIVIL', 'EEE', 'Administration'];
    const titles = ['Faculty', 'HOD', 'Principal', 'Registrar', 'Admin'];

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // 1. Sign up the user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
                options: {
                    data: {
                        name: values.name,
                        phone: values.phone,
                        dept: values.dept,
                        title: values.title,
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create user');

            // Map title to numeric role for the database
            const roleMap: { [key: string]: number } = {
                'Faculty': 1,
                'HOD': 2,
                'Principal': 3,
                'Registrar': 4,
                'Admin': 5
            };

            // 2. Explicitly insert into the 'users' table (profiles)
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    uid: authData.user.id,
                    name: values.name,
                    email: values.email,
                    phone: values.phone,
                    dept: values.dept,
                    title: values.title,
                    role: roleMap[values.title] || 1 // Set numeric role
                });

            if (profileError) throw profileError;

            message.success('Staff account created successfully!');
            form.resetFields();
        } catch (error: any) {
            console.error('Registration error:', error);
            message.error(error.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            id="add-user-container" 
            ref={containerRef}
            className="max-w-4xl mx-auto space-y-10 animate-in slide-up duration-700 relative"
        >
            <header className="space-y-1 px-4">
                <Title level={2} className="!m-0 !text-slate-900 !font-bold !tracking-tight">Register New Staff</Title>
                <Text className="text-slate-400 font-medium tracking-tight block">Create a secure account for university staff members</Text>
            </header>

            <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-white/40 p-8 sm:p-12 transition-all duration-500 relative group/card">
                {/* 🛡️ DECORATIVE BACKGROUND - Added pointer-events-none to prevent click blocking */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover/card:opacity-[0.07] transition-opacity duration-700 rotate-12 pointer-events-none">
                    <UserAddOutlined className="text-[180px] text-brand" />
                </div>
                
                <div className="relative z-10">
                    <div className="mb-12 flex items-center space-x-5">
                        <div className="bg-brand-light w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm">
                            <UserAddOutlined className="text-brand text-2xl" />
                        </div>
                        <div>
                            <Text className="block font-bold text-slate-800 text-xl tracking-tight leading-tight">Account Details</Text>
                            <Text className="text-slate-400 font-medium text-sm tracking-tight">Enter personal and professional credentials</Text>
                        </div>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        requiredMark={false}
                        size="large"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                            <Form.Item
                                name="name"
                                label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</span>}
                                rules={[{ required: true, message: 'Full name is required' }]}
                            >
                                <Input 
                                    prefix={<UserOutlined className="text-brand/40 mr-2" />} 
                                    placeholder="Enter full name"
                                    className="!rounded-2xl !bg-slate-50/50 !border-slate-100 !h-14 font-medium transition-all focus:!bg-white focus:!shadow-[0_0_0_4px_rgba(37,99,235,0.05)]"
                                />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</span>}
                                rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
                            >
                                <Input 
                                    prefix={<MailOutlined className="text-brand/40 mr-2" />} 
                                    placeholder="name@university.edu"
                                    className="!rounded-2xl !bg-slate-50/50 !border-slate-100 !h-14 font-medium transition-all focus:!bg-white focus:!shadow-[0_0_0_4px_rgba(37,99,235,0.05)]"
                                />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Initial Password</span>}
                                rules={[{ required: true, min: 6, message: 'Minimum 6 characters required' }]}
                            >
                                <Input.Password 
                                    prefix={<LockOutlined className="text-brand/40 mr-2" />} 
                                    placeholder="Minimum 6 characters"
                                    className="!rounded-2xl !bg-slate-50/50 !border-slate-100 !h-14 font-medium transition-all focus:!bg-white focus:!shadow-[0_0_0_4px_rgba(37,99,235,0.05)]"
                                />
                            </Form.Item>

                            <Form.Item
                                name="phone"
                                label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number</span>}
                                rules={[{ required: true, message: 'Phone number is required' }]}
                            >
                                <Input 
                                    prefix={<PhoneOutlined className="text-brand/40 mr-2" />} 
                                    placeholder="+91 00000 00000"
                                    className="!rounded-2xl !bg-slate-50/50 !border-slate-100 !h-14 font-medium transition-all focus:!bg-white focus:!shadow-[0_0_0_4px_rgba(37,99,235,0.05)]"
                                />
                            </Form.Item>

                            <Form.Item
                                name="dept"
                                label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Department</span>}
                                rules={[{ required: true, message: 'Please select a department' }]}
                                className="md:col-span-2"
                            >
                                <Radio.Group className="w-full">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {departments.map(d => (
                                            <Radio.Button 
                                                key={d} 
                                                value={d}
                                                className="!h-12 !rounded-xl !border-slate-100 !bg-slate-50/50 hover:!bg-white hover:!border-blue-500 !flex !items-center !justify-center !font-medium !text-slate-600 transition-all active:scale-[0.98] before:!hidden"
                                            >
                                                {d}
                                            </Radio.Button>
                                        ))}
                                    </div>
                                </Radio.Group>
                            </Form.Item>

                            <Form.Item
                                name="title"
                                label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Designation</span>}
                                rules={[{ required: true, message: 'Please select a role' }]}
                                className="md:col-span-2"
                            >
                                <Radio.Group className="w-full">
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {titles.map(t => (
                                            <Radio.Button 
                                                key={t} 
                                                value={t}
                                                className="!h-12 !rounded-xl !border-slate-100 !bg-slate-50/50 hover:!bg-white hover:!border-blue-500 !flex !items-center !justify-center !font-medium !text-slate-600 transition-all active:scale-[0.98] before:!hidden"
                                            >
                                                {t}
                                            </Radio.Button>
                                        ))}
                                    </div>
                                </Radio.Group>
                            </Form.Item>
                        </div>

                        <Form.Item className="mt-10 mb-0">
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={loading} 
                                block
                                className="!h-16 !bg-blue-600 hover:!bg-blue-700 !rounded-3xl !text-sm !font-bold !uppercase !tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] border-none"
                            >
                                Register Account
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>

            <style>{`
                /* Premium Radio Button Chips */
                .ant-radio-button-wrapper {
                    border: 1px solid #f1f5f9 !important;
                    background: rgba(248, 250, 252, 0.5) !important;
                    box-shadow: none !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }

                .ant-radio-button-wrapper:hover {
                    color: #3b82f6 !important;
                    background: white !important;
                    border-color: #3b82f6 !important;
                    transform: translateY(-1px);
                    shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
                }

                .ant-radio-button-wrapper-checked {
                    background: #3b82f6 !important;
                    color: white !important;
                    border-color: #3b82f6 !important;
                    box-shadow: 0 8px 20px -4px rgba(59, 130, 246, 0.3) !important;
                }

                .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)::before {
                    background-color: transparent !important;
                }

                .ant-radio-button-wrapper-checked:hover {
                    color: white !important;
                    background: #2563eb !important;
                }
            `}</style>
        </div>
    );
};


export default AddUser;
