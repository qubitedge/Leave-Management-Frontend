export interface Profile {
    uid: string;
    name: string;
    email: string;
    phone: string;
    dept: string;
    title: string;
    avatar_url?: string;
}

export interface LeaveApplication {
    id: number;
    created_at: string;
    faculty_id: string;
    leave_type: string;
    status: string;
    is_half_day: boolean;
    current_level: number;
    faculty?: Profile;
    voice_blob_name?: string;
}
export interface LeaveApproval {
    id: number;
    decision_by: string;
    decision: string;
    decision_at: string;
    leave_type: string;
    role: number;
    leave_applications?: LeaveApplication;
}
