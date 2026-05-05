import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, Avatar, Modal, Form, Input, Select, message } from 'antd';
import { EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';

const { Title, Text } = Typography;

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(10);

    const departments = ['CSE', 'ECE', 'IT', 'MECH', 'CIVIL', 'EEE', 'Administration'];
    const titles = ['Faculty', 'HOD', 'Principal', 'Registrar', 'Admin'];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('users').select('*');
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => 
        (user.name?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchText.toLowerCase())
    );

    const handleDelete = async (user: any) => {
        Modal.confirm({
            title: 'Delete User',
            content: `Are you sure you want to delete ${user.name}? This action is permanent.`,
            okText: 'Delete',
            okType: 'danger',
            className: 'rounded-3xl',
            onOk: async () => {
                try {
                    const { error } = await supabase.from('users').delete().eq('uid', user.uid);
                    if (error) throw error;
                    message.success('User deleted successfully');
                    fetchUsers();
                } catch (error: any) {
                    message.error(error.message || 'Failed to delete user');
                }
            }
        });
    };

    const handleEdit = (user: any) => {
        setSelectedUser(user);
        form.setFieldsValue({
            name: user.name,
            phone: user.phone,
            dept: user.dept,
            title: user.title,
        });
        setEditModalVisible(true);
    };

    const handleUpdate = async (values: any) => {
        try {
            const { error } = await supabase
                .from('users')
                .update(values)
                .eq('uid', selectedUser.uid);
            
            if (error) throw error;
            
            message.success('User updated successfully');
            setEditModalVisible(false);
            fetchUsers();
        } catch (error: any) {
            message.error(error.message || 'Failed to update user');
        }
    };

    const columns = [
        {
            title: 'STAFF MEMBER',
            key: 'user',
            render: (user: any) => (
                <div className="flex items-center space-x-4 py-1">
                    <Avatar 
                        size={44} 
                        className="bg-slate-50 !text-slate-400 font-bold border border-slate-100 shadow-sm transition-transform duration-300 group-hover:scale-110"
                    >
                        {user.name[0]}
                    </Avatar>
                    <div className="flex flex-col">
                        <Text className="font-bold text-slate-800 text-[14px] tracking-tight leading-tight group-hover:text-brand transition-colors">
                            {user.name}
                        </Text>
                        <Text className="text-[11px] text-slate-400 font-medium tracking-tight mt-0.5">{user.email}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'DESIGNATION',
            dataIndex: 'title',
            key: 'title',
            render: (title: string) => (
                <div className="flex">
                    <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100/50">
                        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">{title}</span>
                    </div>
                </div>
            ),
        },
        {
            title: 'DEPARTMENT',
            dataIndex: 'dept',
            key: 'dept',
            render: (dept: string) => (
                <Text className="text-slate-500 font-medium text-xs tracking-tight">{dept}</Text>
            ),
        },
        {
            title: 'PHONE',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone: string) => (
                <Text className="text-slate-400 font-mono text-[11px] tracking-tight">{phone}</Text>
            ),
        },
        {
            title: 'ACTIONS',
            key: 'actions',
            render: (user: any) => (
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button 
                        type="text" 
                        icon={<EditOutlined className="text-slate-400" />} 
                        onClick={() => handleEdit(user)}
                        className="hover:!bg-slate-100 hover:!text-brand !rounded-xl transition-all duration-300 flex items-center justify-center h-9 w-9"
                    />
                    <Button 
                        type="text" 
                        icon={<DeleteOutlined className="text-slate-400" />} 
                        onClick={() => handleDelete(user)}
                        className="hover:!bg-rose-50 hover:!text-rose-500 !rounded-xl transition-all duration-300 flex items-center justify-center h-9 w-9"
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-10 animate-in slide-up duration-700">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-1">
                    <Title level={2} className="!m-0 !text-slate-900 !font-bold !tracking-tight">Staff Management</Title>
                    <Text className="text-slate-400 font-medium tracking-tight block">Manage and monitor institutional staff accounts</Text>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative group w-full sm:w-72">
                        <Input
                            placeholder="Search by name or email..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            prefix={<SearchOutlined className="text-slate-300 group-focus-within:text-brand transition-colors" />}
                            className="!w-full !h-11 !rounded-full !bg-white !border-slate-200/50 !shadow-sm hover:!border-brand/30 focus:!border-brand focus:!shadow-[0_0_0_4px_rgba(99,102,241,0.1)] transition-all duration-300 font-medium text-sm"
                        />
                    </div>
                    <Select
                        value={pageSize}
                        onChange={setPageSize}
                        className="!h-11 !w-24 apple-select-small"
                        options={[
                            { value: 10, label: '10' },
                            { value: 20, label: '20' },
                            { value: 30, label: '30' },
                        ]}
                    />
                </div>
            </header>

            <div className="bg-white rounded-[2rem] soft-shadow border border-slate-100 overflow-hidden transition-all duration-500">
                <Table 
                    columns={columns} 
                    dataSource={filteredUsers} 
                    loading={loading}
                    rowKey="uid"
                    pagination={{ 
                        pageSize: pageSize,
                        className: 'px-8 !my-6',
                        position: ['bottomRight'],
                        showSizeChanger: false
                    }}
                    rowClassName="group cursor-pointer hover:bg-slate-50/50 transition-all duration-300"
                    className="staff-table"
                />
            </div>

            <Modal
                title={
                    <div className="flex flex-col space-y-1 py-2">
                        <span className="text-xl font-bold text-slate-900 tracking-tight">Staff Profile</span>
                        <span className="text-xs text-slate-400 font-medium tracking-tight">Update account information and permissions</span>
                    </div>
                }
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                footer={null}
                className="apple-modal"
                centered
                width={480}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleUpdate}
                    requiredMark={false}
                    size="large"
                    className="mt-6"
                >
                    <Form.Item 
                        name="name" 
                        label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</span>} 
                        rules={[{ required: true }]}
                    >
                        <Input className="!rounded-2xl !bg-slate-50/50 !border-slate-100 !h-12 font-medium transition-all focus:!bg-white" />
                    </Form.Item>
                    <Form.Item 
                        name="phone" 
                        label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number</span>} 
                        rules={[{ required: true }]}
                    >
                        <Input className="!rounded-2xl !bg-slate-50/50 !border-slate-100 !h-12 font-medium transition-all focus:!bg-white" />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item 
                            name="dept" 
                            label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Department</span>} 
                            rules={[{ required: true }]}
                        >
                            <Select 
                                options={departments.map(d => ({ value: d, label: d }))} 
                                className="apple-select"
                                popupClassName="rounded-2xl shadow-xl border-slate-100"
                            />
                        </Form.Item>
                        <Form.Item 
                            name="title" 
                            label={<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Designation</span>} 
                            rules={[{ required: true }]}
                        >
                            <Select 
                                options={titles.map(t => ({ value: t, label: t }))} 
                                className="apple-select"
                                popupClassName="rounded-2xl shadow-xl border-slate-100"
                            />
                        </Form.Item>
                    </div>
                    <Form.Item className="mb-0 mt-10">
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            block 
                            className="!h-14 !bg-brand hover:!bg-brand/90 !rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-brand/20 transition-all active:scale-[0.98] border-none"
                        >
                            Update Profile
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <style>{`
                .staff-table .ant-table-thead > tr > th {
                    background: #fff;
                    color: #94a3b8;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    border-bottom: none !important;
                    padding: 20px 24px;
                }
                
                .staff-table .ant-table-tbody > tr > td {
                    padding: 16px 24px;
                    border-bottom: 1px solid #f8fafc;
                    transition: all 0.3s;
                }

                .staff-table .ant-table-tbody > tr:last-child > td {
                    border-bottom: none;
                }

                .apple-select-small .ant-select-selector {
                    border-radius: 2rem !important;
                    background-color: white !important;
                    border: 1px solid #f1f5f9 !important;
                    height: 2.75rem !important;
                    display: flex !important;
                    align-items: center !important;
                    transition: all 0.3s !important;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03) !important;
                }

                .apple-select .ant-select-selector:hover {
                    border-color: rgba(99, 102, 241, 0.3) !important;
                }

                .apple-modal .ant-modal-content {
                    border-radius: 2.5rem !important;
                    padding: 32px !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08) !important;
                }

                .ant-table-pagination-item-active {
                    border-color: #6366f1 !important;
                    background: #6366f1 !important;
                }
                
                .ant-table-pagination-item-active a {
                    color: #fff !important;
                }
            `}</style>
        </div>
    );
};


export default Users;
