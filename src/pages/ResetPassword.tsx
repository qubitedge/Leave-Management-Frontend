import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';

const { Title, Text } = Typography;

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === "SIGNED_IN") {
        console.log("Recovery session established");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) throw error;

      setIsSuccess(true);
      message.success("Password updated successfully!");
    } catch (error: any) {
      message.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB] p-4">
        <Card className="w-full max-w-md shadow-lg rounded-[2rem]">
          <Result
            status="success"
            title="Password Updated"
            subTitle="Your JNTUGV VoiceLeave password has been changed. You can now close this tab and log in to the mobile app."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB] p-4 font-sans">
      <Card className="w-full max-w-md shadow-2xl border-0 rounded-[2.5rem]">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
            <LockOutlined className="text-white text-3xl" />
          </div>
          <Title level={2} className="m-0 !text-indigo-900 !font-extrabold">New Password</Title>
          <Text className="text-gray-400 font-medium">Enter a strong password for your VoiceLeave account</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="password"
            label={<span className="font-bold text-gray-600 ml-1">New Password</span>}
            rules={[
              { required: true, message: 'Please enter your new password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-indigo-400 mr-2" />}
              placeholder="••••••••"
              className="rounded-2xl !bg-[#F6F7FB] !border-none h-14"
            />
          </Form.Item>

          <Form.Item
            name="confirm"
            label={<span className="font-bold text-gray-600 ml-1">Confirm Password</span>}
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-indigo-400 mr-2" />}
              placeholder="••••••••"
              className="rounded-2xl !bg-[#F6F7FB] !border-none h-14"
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-8">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="!h-14 !bg-indigo-600 hover:!bg-indigo-700 !rounded-2xl !font-black !text-lg shadow-xl"
            >
              Update Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ResetPassword;
