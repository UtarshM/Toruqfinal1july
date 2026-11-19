import { getDB } from '../lib/db';

export interface TorquePayrollRecord {
  id: string;
  user_id?: string;
  employee_name: string;
  role_name: string;
  join_date: string;
  month_year: string;
  fix_salary: number;
  policy_count: number;
  policy_rate: number;
  incentive_amount: number;
  prize_amount: number;
  shift_timing: string;
  cl_allowed: number;
  cl_used: number;
  cl_balance: number;
  lwp_days: number;
  lwp_deduction: number;
  late_count: number;
  late_grace: number;
  penalty_count: number;
  penalty_amount: number;
  liability_amount: number;
  liability_note: string;
  upad_amount: number;
  total_earning: number;
  paid_eom: number;
  status: 'pending' | 'processed' | 'disbursed';
  disbursement_date: string | null;
  payment_mode?: string;
  created_at: string;
}

export interface UpadAdvanceRecord {
  id: string;
  user_id?: string;
  employee_name: string;
  amount: number;
  payment_mode: 'Cash' | 'Online';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'deducted';
  created_at: string;
  approved_by?: string;
}

export interface LeaveRequestRecord {
  id: string;
  user_id?: string;
  employee_name: string;
  leave_type: 'Casual' | 'LWP' | 'Emergency' | 'Sick';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by?: string;
}

/**
 * 27 Torque Auto Advisor Employees — September 2026 Baseline
 * Decoded directly from the official Salary torque ledger.
 */
export const TORQUE_SEP2026_MASTER_PAYROLL: TorquePayrollRecord[] = [
  {
    id: "torque_sal_sep2026_01",
    employee_name: "SHAHID IBVANI",
    role_name: "GENERAL MANAGER",
    join_date: "22-11-2024",
    month_year: "2026-09",
    fix_salary: 60000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 5.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 0,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 60000.0,
    paid_eom: 60000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_02",
    employee_name: "PARVEZ BELIM",
    role_name: "SALES EXECUTIVE",
    join_date: "2024-01-04",
    month_year: "2026-09",
    fix_salary: 25000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 08:30",
    cl_allowed: 4.0,
    cl_used: 2.5,
    cl_balance: 1.5,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 19,
    late_grace: 3,
    penalty_count: 2,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 14500.0,
    total_earning: 25000.0,
    paid_eom: 10500.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_03",
    employee_name: "PERIN LOLADIYA",
    role_name: "SALES EXECUTIVE",
    join_date: "16-07-2024",
    month_year: "2026-09",
    fix_salary: 0.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 25000.0,
    prize_amount: 25000,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 4.0,
    cl_balance: 0.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 0,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 13000.0,
    total_earning: 25000.0,
    paid_eom: 12000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_04",
    employee_name: "SONALI KANZARIYA",
    role_name: "RENEWAL EXECUTIVE",
    join_date: "2024-08-04",
    month_year: "2026-09",
    fix_salary: 18000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 5000.0,
    prize_amount: 5000,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 4.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 1,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 23000.0,
    paid_eom: 23000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_05",
    employee_name: "JALPA NAKUM",
    role_name: "SALES EXECUTIVE",
    join_date: "22-07-2024",
    month_year: "2026-09",
    fix_salary: 18000.0,
    policy_count: 16,
    policy_rate: 500,
    incentive_amount: 20000.0,
    prize_amount: 20000,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 7.5,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 1,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 2000.0,
    liability_note: "Net Rate -2000",
    upad_amount: 0.0,
    total_earning: 36000.0,
    paid_eom: 36000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_06",
    employee_name: "PRIYA PITHVA",
    role_name: "SALES EXECUTIVE",
    join_date: "2024-01-10",
    month_year: "2026-09",
    fix_salary: 18000.0,
    policy_count: 6,
    policy_rate: 500,
    incentive_amount: 3000.0,
    prize_amount: 0,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 4.5,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 3,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 700.0,
    liability_note: "GJ11W1060 -700 Hold",
    upad_amount: 0.0,
    total_earning: 20300.0,
    paid_eom: 20300.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_07",
    employee_name: "VARSHA AJANA",
    role_name: "SALES EXECUTIVE",
    join_date: "16-09-2024",
    month_year: "2026-09",
    fix_salary: 12000.0,
    policy_count: 14,
    policy_rate: 0,
    incentive_amount: 15000.0,
    prize_amount: 15000,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 6.5,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 10,
    late_grace: 3,
    penalty_count: 1,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 27000.0,
    paid_eom: 27000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_08",
    employee_name: "ALJINA CHAVDA",
    role_name: "SALES EXECUTIVE",
    join_date: "2024-04-11",
    month_year: "2026-09",
    fix_salary: 11000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 20000.0,
    prize_amount: 20000,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 4.0,
    cl_balance: 0.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 0,
    late_grace: 3,
    penalty_count: 3,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 10000.0,
    total_earning: 31000.0,
    paid_eom: 21000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_09",
    employee_name: "BHARTI VAGHELA",
    role_name: "SALES EXECUTIVE",
    join_date: "19-08-2025",
    month_year: "2026-09",
    fix_salary: 10500.0,
    policy_count: 7,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "10:00 to 06:30",
    cl_allowed: 4.0,
    cl_used: 2.0,
    cl_balance: 2.0,
    lwp_days: 0.5,
    lwp_deduction: 175.0,
    late_count: 4,
    late_grace: 3,
    penalty_count: 1,
    penalty_amount: 0.0,
    liability_amount: 200.0,
    liability_note: "GJ36AS3179 PUC -200",
    upad_amount: 0.0,
    total_earning: 10125.0,
    paid_eom: 10125.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_10",
    employee_name: "DIVYABA ZALA",
    role_name: "FOLLOW UP & HR MANAGER",
    join_date: "18-06-2025",
    month_year: "2026-09",
    fix_salary: 20000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 06:00",
    cl_allowed: 4.0,
    cl_used: 4.0,
    cl_balance: 0.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 1,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 20000.0,
    paid_eom: 20000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_11",
    employee_name: "PAYAL VITHTHLAPARA",
    role_name: "CRM",
    join_date: "2025-01-08",
    month_year: "2026-09",
    fix_salary: 18000.0,
    policy_count: 20,
    policy_rate: 700,
    incentive_amount: 14000.0,
    prize_amount: 0,
    shift_timing: "9:30 to 06:00",
    cl_allowed: 4.0,
    cl_used: 1.0,
    cl_balance: 3.0,
    lwp_days: 1.0,
    lwp_deduction: 600.0,
    late_count: 3,
    late_grace: 3,
    penalty_count: 1,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 31400.0,
    paid_eom: 31400.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_12",
    employee_name: "MUSTAFA BLOCH",
    role_name: "OFFICE BOY",
    join_date: "2025-01-10",
    month_year: "2026-09",
    fix_salary: 12000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 08:15",
    cl_allowed: 4.0,
    cl_used: 2.0,
    cl_balance: 2.0,
    lwp_days: 2.0,
    lwp_deduction: 800.0,
    late_count: 0,
    late_grace: 3,
    penalty_count: 1,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "PUC -166",
    upad_amount: 0.0,
    total_earning: 11200.0,
    paid_eom: 11200.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_13",
    employee_name: "ANISH PATHAN",
    role_name: "FIELD WORK EXECUTIVE",
    join_date: "10-04-2025",
    month_year: "2026-09",
    fix_salary: 15000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 500.0,
    prize_amount: 500,
    shift_timing: "9:30 to 08:15",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 5.5,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 23,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 7000.0,
    total_earning: 15500.0,
    paid_eom: 8500.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_14",
    employee_name: "HARSHA PARMAR",
    role_name: "SALES EXECUTIVE",
    join_date: "2025-05-12",
    month_year: "2026-09",
    fix_salary: 10500.0,
    policy_count: 10.5,
    policy_rate: 0,
    incentive_amount: 5000.0,
    prize_amount: 5000,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 7.5,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 7,
    late_grace: 3,
    penalty_count: 1,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 15500.0,
    paid_eom: 15500.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_15",
    employee_name: "HARIRAJSINH ZALA",
    role_name: "LOAN EXECUTIVE",
    join_date: "16-09-2025",
    month_year: "2026-09",
    fix_salary: 15000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 06:00",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 6.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 0,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 15000.0,
    paid_eom: 15000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_16",
    employee_name: "FARJANA BHATTI",
    role_name: "SALES EXECUTIVE",
    join_date: "17-10-2025",
    month_year: "2026-09",
    fix_salary: 10500.0,
    policy_count: 5.5,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "10:00 to 06:30",
    cl_allowed: 4.0,
    cl_used: 2.0,
    cl_balance: 2.0,
    lwp_days: 0.5,
    lwp_deduction: 175.0,
    late_count: 3,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 10325.0,
    paid_eom: 10325.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_17",
    employee_name: "FAIZAN DAVALIYA",
    role_name: "POLICY DISPATCH PERSON",
    join_date: "2025-01-12",
    month_year: "2026-09",
    fix_salary: 12000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 08:30",
    cl_allowed: 4.0,
    cl_used: 0.5,
    cl_balance: 3.5,
    lwp_days: 2.0,
    lwp_deduction: 800.0,
    late_count: 18,
    late_grace: 3,
    penalty_count: 3,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 11200.0,
    paid_eom: 11200.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_18",
    employee_name: "GAZALA HERANJA",
    role_name: "SALES EXECUTIVE",
    join_date: "16-12-2025",
    month_year: "2026-09",
    fix_salary: 10000.0,
    policy_count: 3.5,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 06:30",
    cl_allowed: 4.0,
    cl_used: 0.5,
    cl_balance: 3.5,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 2,
    late_grace: 3,
    penalty_count: 3,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 10000.0,
    paid_eom: 10000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_19",
    employee_name: "MUKTA VAGHELA",
    role_name: "SALES EXECUTIVE",
    join_date: "2026-01-04",
    month_year: "2026-09",
    fix_salary: 12000.0,
    policy_count: 8,
    policy_rate: 0,
    incentive_amount: 5000.0,
    prize_amount: 5000,
    shift_timing: "9:30 to 06:00",
    cl_allowed: 4.0,
    cl_used: 1.0,
    cl_balance: 3.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 5,
    late_grace: 3,
    penalty_count: 2,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 3000.0,
    total_earning: 17000.0,
    paid_eom: 14000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_20",
    employee_name: "KHUSHI GUPTA",
    role_name: "SALES EXECUTIVE",
    join_date: "2026-02-06",
    month_year: "2026-09",
    fix_salary: 10000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 06:00",
    cl_allowed: 4.0,
    cl_used: 1.0,
    cl_balance: 3.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 3,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 10000.0,
    paid_eom: 10000.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_21",
    employee_name: "JINAL OSWAL",
    role_name: "SALES EXECUTIVE",
    join_date: "22/06/2026",
    month_year: "2026-09",
    fix_salary: 15000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 3500.0,
    prize_amount: 3500,
    shift_timing: "10:00 to 06:00",
    cl_allowed: 4.0,
    cl_used: 0.0,
    cl_balance: 5.0,
    lwp_days: 0.0,
    lwp_deduction: 0.0,
    late_count: 3,
    late_grace: 3,
    penalty_count: 1,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 18500.0,
    paid_eom: 18500.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_22",
    employee_name: "JINSI KAKKAD",
    role_name: "SALES EXECUTIVE",
    join_date: "2026-01-07",
    month_year: "2026-09",
    fix_salary: 10000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 06:00",
    cl_allowed: 4.0,
    cl_used: 1.5,
    cl_balance: 2.5,
    lwp_days: 1.0,
    lwp_deduction: 333.33,
    late_count: 6,
    late_grace: 3,
    penalty_count: 2,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 9667.0,
    paid_eom: 9667.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_23",
    employee_name: "ISHITA JADAV",
    role_name: "SALES EXECUTIVE",
    join_date: "2026-01-07",
    month_year: "2026-09",
    fix_salary: 10000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 06:00",
    cl_allowed: 4.0,
    cl_used: 2.0,
    cl_balance: 2.0,
    lwp_days: 1.5,
    lwp_deduction: 500.0,
    late_count: 2,
    late_grace: 3,
    penalty_count: 1,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 9500.0,
    paid_eom: 9500.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_24",
    employee_name: "KOMAL RATHOD",
    role_name: "SALES EXECUTIVE",
    join_date: "2026-03-08",
    month_year: "2026-09",
    fix_salary: 1665.0,
    policy_count: 4.5,
    policy_rate: 1000,
    incentive_amount: 4500.0,
    prize_amount: 0,
    shift_timing: "WFH",
    cl_allowed: 4.0,
    cl_used: 2.0,
    cl_balance: 2.0,
    lwp_days: 1.5,
    lwp_deduction: 83.25,
    late_count: 0,
    late_grace: 3,
    penalty_count: 1,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 6165.0,
    paid_eom: 6165.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_25",
    employee_name: "KRUPALI SOLANKI",
    role_name: "SALES EXECUTIVE",
    join_date: "2026-03-08",
    month_year: "2026-09",
    fix_salary: 10000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "9:30 to 06:00",
    cl_allowed: 4.0,
    cl_used: 1.0,
    cl_balance: 3.0,
    lwp_days: 2.0,
    lwp_deduction: 666.67,
    late_count: 4,
    late_grace: 3,
    penalty_count: 2,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "",
    upad_amount: 0.0,
    total_earning: 9334.0,
    paid_eom: 9334.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_26",
    employee_name: "JETUN BEN",
    role_name: "CLEANING",
    join_date: "28-1-26",
    month_year: "2026-09",
    fix_salary: 10000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 4.0,
    cl_balance: 0,
    lwp_days: 0,
    lwp_deduction: 0.0,
    late_count: 0,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 500.0,
    liability_note: "",
    upad_amount: 2000.0,
    total_earning: 9500.0,
    paid_eom: 7500.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  },
  {
    id: "torque_sal_sep2026_27",
    employee_name: "CHHAYA VAGHELA",
    role_name: "POLICY MAKING",
    join_date: "2026-09-07",
    month_year: "2026-09",
    fix_salary: 13000.0,
    policy_count: 0,
    policy_rate: 0,
    incentive_amount: 0.0,
    prize_amount: 0,
    shift_timing: "10:00 to 07:00",
    cl_allowed: 4.0,
    cl_used: 4.0,
    cl_balance: 0.0,
    lwp_days: 22.0,
    lwp_deduction: 9533.33,
    late_count: 0,
    late_grace: 3,
    penalty_count: 0,
    penalty_amount: 0.0,
    liability_amount: 0.0,
    liability_note: "Left on 16 Sept",
    upad_amount: 0.0,
    total_earning: 3500.0,
    paid_eom: 3500.0,
    status: "disbursed",
    disbursement_date: "2026-10-02",
    payment_mode: "Bank Transfer",
    created_at: "2026-10-01T10:00:00Z"
  }
];

export const torquePayrollService = {
  /**
   * Initializes SQLite tables and seeds the September 2026 baseline if empty
   */
  async init(): Promise<void> {
    try {
      const db = await getDB();
      
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS torque_payroll_records (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          employee_name TEXT NOT NULL,
          role_name TEXT NOT NULL,
          join_date TEXT,
          month_year TEXT NOT NULL,
          fix_salary REAL NOT NULL,
          policy_count REAL DEFAULT 0,
          policy_rate REAL DEFAULT 0,
          incentive_amount REAL DEFAULT 0,
          prize_amount REAL DEFAULT 0,
          shift_timing TEXT,
          cl_allowed REAL DEFAULT 4,
          cl_used REAL DEFAULT 0,
          cl_balance REAL DEFAULT 0,
          lwp_days REAL DEFAULT 0,
          lwp_deduction REAL DEFAULT 0,
          late_count INTEGER DEFAULT 0,
          late_grace INTEGER DEFAULT 3,
          penalty_count INTEGER DEFAULT 0,
          penalty_amount REAL DEFAULT 0,
          liability_amount REAL DEFAULT 0,
          liability_note TEXT,
          upad_amount REAL DEFAULT 0,
          total_earning REAL NOT NULL,
          paid_eom REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          disbursement_date TEXT,
          payment_mode TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS torque_upad_advances (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          employee_name TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_mode TEXT NOT NULL,
          reason TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT NOT NULL,
          approved_by TEXT
        );

        CREATE TABLE IF NOT EXISTS torque_leave_requests (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          employee_name TEXT NOT NULL,
          leave_type TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          days REAL NOT NULL,
          reason TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT NOT NULL,
          reviewed_by TEXT
        );
      `);

      // Check if records already exist
      const existing = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM torque_payroll_records WHERE month_year = '2026-09'"
      );

      if (!existing || existing.count === 0) {
        for (const item of TORQUE_SEP2026_MASTER_PAYROLL) {
          await db.runAsync(
            `INSERT OR REPLACE INTO torque_payroll_records (
              id, user_id, employee_name, role_name, join_date, month_year,
              fix_salary, policy_count, policy_rate, incentive_amount, prize_amount,
              shift_timing, cl_allowed, cl_used, cl_balance, lwp_days, lwp_deduction,
              late_count, late_grace, penalty_count, penalty_amount, liability_amount,
              liability_note, upad_amount, total_earning, paid_eom, status,
              disbursement_date, payment_mode, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id, item.user_id || null, item.employee_name, item.role_name, item.join_date, item.month_year,
              item.fix_salary, item.policy_count, item.policy_rate, item.incentive_amount, item.prize_amount,
              item.shift_timing, item.cl_allowed, item.cl_used, item.cl_balance, item.lwp_days, item.lwp_deduction,
              item.late_count, item.late_grace, item.penalty_count, item.penalty_amount, item.liability_amount,
              item.liability_note, item.upad_amount, item.total_earning, item.paid_eom, item.status,
              item.disbursement_date, item.payment_mode || 'Bank Transfer', item.created_at
            ]
          );
        }
      }
    } catch (err) {
      console.warn('[Torque Payroll DB] Init error:', err);
    }
  },

  /**
   * Retrieves all records for Admin
   */
  async getAdminMasterRecords(monthYear = '2026-09'): Promise<TorquePayrollRecord[]> {
    await this.init();
    try {
      const db = await getDB();
      const rows = await db.getAllAsync<TorquePayrollRecord>(
        'SELECT * FROM torque_payroll_records WHERE month_year = ? ORDER BY paid_eom DESC',
        [monthYear]
      );
      if (rows && rows.length > 0) return rows;
      return TORQUE_SEP2026_MASTER_PAYROLL;
    } catch (e) {
      return TORQUE_SEP2026_MASTER_PAYROLL;
    }
  },

  /**
   * Retrieves employee personal record by name or user_id
   */
  async getEmployeeSalarySlip(userName: string, userId?: string, monthYear = '2026-09'): Promise<TorquePayrollRecord | null> {
    await this.init();
    try {
      const db = await getDB();
      if (userId) {
        const rowById = await db.getFirstAsync<TorquePayrollRecord>(
          'SELECT * FROM torque_payroll_records WHERE user_id = ? AND month_year = ?',
          [userId, monthYear]
        );
        if (rowById) return rowById;
      }

      const cleanName = (userName || '').trim().toUpperCase();
      const rows = await db.getAllAsync<TorquePayrollRecord>(
        'SELECT * FROM torque_payroll_records WHERE month_year = ?',
        [monthYear]
      );

      const found = rows.find(r => {
        const rName = r.employee_name.trim().toUpperCase();
        return rName === cleanName || cleanName.includes(rName) || rName.includes(cleanName);
      });

      if (found) return found;
      return rows[1] || TORQUE_SEP2026_MASTER_PAYROLL[1];
    } catch (e) {
      return TORQUE_SEP2026_MASTER_PAYROLL[1];
    }
  },

  /**
   * Apply for Leave (Employee)
   */
  async applyLeave(data: {
    userId?: string;
    employeeName: string;
    leaveType: 'Casual' | 'LWP' | 'Emergency' | 'Sick';
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
  }): Promise<LeaveRequestRecord> {
    await this.init();
    const db = await getDB();
    const id = 'leave_' + Date.now();
    const now = new Date().toISOString();
    const rec: LeaveRequestRecord = {
      id,
      user_id: data.userId,
      employee_name: data.employeeName,
      leave_type: data.leaveType,
      start_date: data.startDate,
      end_date: data.endDate,
      days: data.days,
      reason: data.reason,
      status: 'pending',
      created_at: now
    };

    await db.runAsync(
      `INSERT INTO torque_leave_requests (id, user_id, employee_name, leave_type, start_date, end_date, days, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rec.id, rec.user_id || null, rec.employee_name, rec.leave_type, rec.start_date, rec.end_date, rec.days, rec.reason, rec.status, rec.created_at]
    );

    return rec;
  },

  /**
   * Apply for Upad (Salary Advance)
   */
  async applyUpad(data: {
    userId?: string;
    employeeName: string;
    amount: number;
    paymentMode: 'Cash' | 'Online';
    reason: string;
  }): Promise<UpadAdvanceRecord> {
    await this.init();
    const db = await getDB();
    const id = 'upad_' + Date.now();
    const now = new Date().toISOString();
    const rec: UpadAdvanceRecord = {
      id,
      user_id: data.userId,
      employee_name: data.employeeName,
      amount: data.amount,
      payment_mode: data.paymentMode,
      reason: data.reason,
      status: 'pending',
      created_at: now
    };

    await db.runAsync(
      `INSERT INTO torque_upad_advances (id, user_id, employee_name, amount, payment_mode, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rec.id, rec.user_id || null, rec.employee_name, rec.amount, rec.payment_mode, rec.reason, rec.status, rec.created_at]
    );

    return rec;
  },

  /**
   * Get all Upad requests
   */
  async getUpadRequests(employeeName?: string): Promise<UpadAdvanceRecord[]> {
    await this.init();
    try {
      const db = await getDB();
      if (employeeName) {
        return await db.getAllAsync<UpadAdvanceRecord>(
          'SELECT * FROM torque_upad_advances WHERE UPPER(employee_name) = ? ORDER BY created_at DESC',
          [employeeName.toUpperCase()]
        );
      }
      return await db.getAllAsync<UpadAdvanceRecord>('SELECT * FROM torque_upad_advances ORDER BY created_at DESC');
    } catch {
      return [];
    }
  },

  /**
   * Get all leave requests
   */
  async getLeaveRequests(employeeName?: string): Promise<LeaveRequestRecord[]> {
    await this.init();
    try {
      const db = await getDB();
      if (employeeName) {
        return await db.getAllAsync<LeaveRequestRecord>(
          'SELECT * FROM torque_leave_requests WHERE UPPER(employee_name) = ? ORDER BY created_at DESC',
          [employeeName.toUpperCase()]
        );
      }
      return await db.getAllAsync<LeaveRequestRecord>('SELECT * FROM torque_leave_requests ORDER BY created_at DESC');
    } catch {
      return [];
    }
  },

  /**
   * Admin approves Upad advance
   */
  async approveUpad(id: string, approverName: string): Promise<void> {
    await this.init();
    const db = await getDB();
    await db.runAsync(
      "UPDATE torque_upad_advances SET status = 'approved', approved_by = ? WHERE id = ?",
      [approverName, id]
    );
  },

  /**
   * Admin marks salary disbursed
   */
  async markDisbursed(id: string): Promise<void> {
    await this.init();
    const db = await getDB();
    const today = new Date().toISOString().split('T')[0];
    await db.runAsync(
      "UPDATE torque_payroll_records SET status = 'disbursed', disbursement_date = ? WHERE id = ?",
      [today, id]
    );
  }
};
