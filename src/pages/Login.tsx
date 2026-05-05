import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../assets/Logo_JNTU.png';

const { Title, Text } = Typography;

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const phone = values.phone.startsWith('+') ? values.phone : `+${values.phone}`;
            const { error } = await supabase.auth.signInWithPassword({
                phone: phone,
                password: values.password,
            });

            if (error) throw error;

            message.success('Login successful!');
            navigate('/');
        } catch (error: any) {
            message.error(error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-6 font-sans animate-in fade-in">
            <div className="w-full max-w-[440px] text-center mb-10">
                <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6 transition-all duration-700 hover:rotate-[360deg] cursor-pointer">
                    <img src={logo} alt="JNTU Logo" className="w-full h-full object-contain filter grayscale-[0.2]" />
                </div>
                <Title level={1} className="!m-0 !text-slate-900 !font-bold !text-4xl !tracking-tighter">VoiceLeave</Title>
                <Text className="text-slate-400 font-medium text-base mt-2 block tracking-tight">University Leave Management Portal</Text>
            </div>

            <div className="w-full max-w-[440px] bg-white rounded-[2.5rem] soft-shadow border border-slate-100 p-8 sm:p-10">
                <Form
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                    size="large"
                    className="space-y-5"
                >
                    <Form.Item
                        name="phone"
                        label={<span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest ml-1">Phone Number</span>}
                        rules={[{ required: true, message: 'Enter your registered phone number' }]}
                    >
                        <Input 
                            prefix={<PhoneOutlined className="text-brand/40 mr-2" />} 
                            placeholder="+91 9876543210"
                            className="!rounded-2xl !bg-slate-50/50 !border-slate-100 !h-14 font-medium transition-all hover:border-brand/30 focus:border-brand"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={<span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest ml-1">Password</span>}
                        rules={[{ required: true, message: 'Enter your password' }]}
                    >
                        <Input.Password 
                            prefix={<LockOutlined className="text-brand/40 mr-2" />} 
                            placeholder="••••••••"
                            className="!rounded-2xl !bg-slate-50/50 !border-slate-100 !h-14 font-medium transition-all hover:border-brand/30 focus:border-brand"
                        />
                    </Form.Item>

                    <Form.Item className="pt-2 mb-0">
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading} 
                            block
                            className="!h-14 bg-brand hover:bg-brand/90 !rounded-2xl !text-sm !font-bold !uppercase !tracking-[0.2em] shadow-xl shadow-brand/20 transition-all border-none"
                        >
                            Sign In
                        </Button>
                    </Form.Item>
                </Form>
            </div>
            
            <div className="mt-12 text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                © 2026 JNTUGV IT Cell
            </div>
        </div>
    );
};


export default Login;
