export type UserRole = "teacher" | "student";
export type ExamMedium = "bn" | "en";
export type ExamStatus = "draft" | "published" | "closed";
export type ResultReleaseMode = "after_submit" | "after_close" | "manual" | "teacher_only";
export type AttemptStatus = "in_progress" | "submitted" | "auto_submitted";

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  roll: string | null;
  institution: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherProfile {
  user_id: string;
  teacher_code: string;
  ai_provider: "gemini" | "groq" | "openai" | "anthropic" | null;
  ai_model?: string | null;
  ai_key_hint?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentUserContext {
  configured: boolean;
  userId: string | null;
  email: string | null;
  emailVerified: boolean;
  profile: Profile | null;
  teacherProfile: TeacherProfile | null;
}

export interface Exam {
  id: string;
  teacher_id: string;
  name: string;
  subject: string;
  class: string;
  medium: ExamMedium;
  question_count: number;
  duration_minutes: number;
  options_per_question: number;
  default_marks: number;
  negative_marking: boolean;
  negative_value: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  schedule_enabled: boolean;
  opens_at: string | null;
  closes_at: string | null;
  force_close_active: boolean;
  instructions: string;
  result_release: ResultReleaseMode;
  results_released_at: string | null;
  show_answers: boolean;
  practice_sharing: boolean;
  code: string;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  position: number;
  text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  marks: number;
  bank_id: string | null;
  created_at: string;
}

export interface QuestionBankItem {
  id: string;
  teacher_id: string;
  text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  subject: string;
  class: string;
  tags: string[];
  medium: ExamMedium;
  source: "manual" | "ai" | "pdf";
  visibility: "private" | "shared";
  created_at: string;
  updated_at: string;
}

export interface StudentQuestionOption {
  canonicalIndex: number;
  text: string;
}

export interface StudentExamQuestion {
  id: string;
  text: string;
  marks: number;
  options: StudentQuestionOption[];
}

export interface ViolationCounts {
  tab_switches: number;
  blurs: number;
  fullscreen_exits: number;
  copy_attempts: number;
  away_seconds: number;
}

export interface AttemptDetail {
  id: string;
  exam_id: string;
  student_id: string;
  student_name: string;
  student_roll: string | null;
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  status: AttemptStatus;
  answers: Record<string, number> | null;
  draft_answers: Record<string, number>;
  score: number | null;
  total_marks: number | null;
  violation_counts: ViolationCounts;
}

export interface EntryEvent {
  id: string;
  exam_id: string;
  student_id: string;
  event_type: "joined" | "resumed" | "second_device" | "new_tab";
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}
