import {
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiFileText,
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
  { to: '/teachers', label: 'Teachers', icon: FiUser, roles: [ROLES.admin], resource: 'teachers' },
  { to: '/subjects', label: 'Subjects', icon: FiBookOpen, roles: [ROLES.admin], resource: 'subjects' },
  { to: '/discipline-reports/review', label: 'Rapports disciplinaires', icon: FiFileText, roles: [ROLES.admin] },
  { to: '/settings', label: 'Settings', icon: FiSettings, roles: [ROLES.admin] },
  { to: '/teacher', label: 'Dashboard', icon: FiGrid, roles: [ROLES.teacher] },
  { to: '/my-classes', label: 'My Classes', icon: FiUsers, roles: [ROLES.teacher], resource: 'classes' },
  { to: '/grades', label: 'Grades', icon: FiClipboard, roles: [ROLES.teacher], resource: 'grades' },
  { to: '/attendance', label: 'Attendance', icon: FiCalendar, roles: [ROLES.teacher], resource: 'attendance' },
  { to: '/discipline-reports', label: 'Rapports disciplinaires', icon: FiFileText, roles: [ROLES.teacher] },
  { to: '/profile', label: 'Profile', icon: FiUser, roles: [ROLES.teacher] },
  { to: '/student', label: 'Dashboard', icon: FiGrid, roles: [ROLES.student] },
  { to: '/my-grades', label: 'My Grades', icon: FiClipboard, roles: [ROLES.student], resource: 'grades' },
  { to: '/my-attendance', label: 'My Attendance', icon: FiCalendar, roles: [ROLES.student], resource: 'attendance' },
  { to: '/my-discipline-reports', label: 'Mes rapports disciplinaires', icon: FiFileText, roles: [ROLES.student] },
  { to: '/profile', label: 'Profile', icon: FiUser, roles: [ROLES.student] },
]

export function homeForRole(role) {
  return ROLE_HOME[role] || '/login'
}

export function canAccessRole(user, roles = []) {
  return Boolean(user?.role && roles.includes(user.role))
}
