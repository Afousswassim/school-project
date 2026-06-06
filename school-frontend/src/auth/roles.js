import {
  FiBarChart2,
  FiBookOpen,
  FiCreditCard,
  FiGrid,
  FiSettings,
  FiUser,
  FiUsers,
} from 'react-icons/fi'

export const ROLES = {
  admin: 'admin',
  teacher: 'teacher',
  student: 'student',
}

export const ROLE_HOME = {
  [ROLES.admin]: '/',
  [ROLES.teacher]: '/my-classes',
  [ROLES.student]: '/my-grades',
}

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: FiGrid, roles: [ROLES.admin] },
  { to: '/students', label: 'Students', icon: FiUsers, roles: [ROLES.admin], resource: 'students' },
  { to: '/teachers', label: 'Teachers', icon: FiUsers, roles: [ROLES.admin], resource: 'teachers' },
  { to: '/subjects', label: 'Subjects', icon: FiBookOpen, roles: [ROLES.admin], resource: 'subjects' },
  { to: '/payments', label: 'Payments', icon: FiCreditCard, roles: [ROLES.admin], resource: 'payments' },
  { to: '/reports', label: 'Reports', icon: FiBarChart2, roles: [ROLES.admin] },
  { to: '/settings', label: 'Settings', icon: FiSettings, roles: [ROLES.admin] },
  { to: '/teacher', label: 'Dashboard', icon: FiGrid, roles: [ROLES.teacher] },
  { to: '/my-classes', label: 'My Classes', icon: FiUsers, roles: [ROLES.teacher], resource: 'classes' },
  { to: '/grades', label: 'Grades', icon: FiBookOpen, roles: [ROLES.teacher], resource: 'grades' },
  { to: '/attendance', label: 'Attendance', icon: FiGrid, roles: [ROLES.teacher], resource: 'attendance' },
  { to: '/profile', label: 'Profile', icon: FiUser, roles: [ROLES.teacher] },
  { to: '/student', label: 'Dashboard', icon: FiGrid, roles: [ROLES.student] },
  { to: '/my-grades', label: 'My Grades', icon: FiBookOpen, roles: [ROLES.student], resource: 'grades' },
  { to: '/my-attendance', label: 'My Attendance', icon: FiGrid, roles: [ROLES.student], resource: 'attendance' },
  { to: '/profile', label: 'Profile', icon: FiUser, roles: [ROLES.student] },
]

export function homeForRole(role) {
  return ROLE_HOME[role] || '/login'
}

export function canAccessRole(user, roles = []) {
  return Boolean(user?.role && roles.includes(user.role))
}
