import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { 
  Shield, 
  Users as UsersIcon, 
  Key, 
  Settings, 
  Lock,
  CheckCircle,
  XCircle,
  Play
} from 'lucide-react'
import { selectUser, selectPermissions } from '../store/slices/authSlice'
import { authAPI, usersAPI } from '../services/api'

const Dashboard = () => {
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const permissions = useSelector(selectPermissions)
  const [users, setUsers] = useState([])
  const [simulation, setSimulation] = useState(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll()
      setUsers(response.data)
    } catch (error) {
      // Ignore error - user might not have permission to view users
    }
  }

  const onSimulate = async (data) => {
    setLoading(true)
    try {
      const response = await authAPI.simulateAction({
        userId: parseInt(data.userId),
        module: data.module,
        action: data.action
      })
      setSimulation(response.data)
      toast.success('Simulation completed')
    } catch (error) {
      toast.error('Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const permissionCount = Object.values(permissions).reduce((total, actions) => total + actions.length, 0)
  const moduleCount = Object.keys(permissions).length

  const modules = ['Users', 'Groups', 'Roles', 'Modules', 'Permissions']
  const actions = ['create', 'read', 'update', 'delete']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to your IAM dashboard, {user?.username}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Permissions</p>
              <p className="text-2xl font-bold text-gray-900">{permissionCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Accessible Modules</p>
              <p className="text-2xl font-bold text-gray-900">{moduleCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Key className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">User Account</p>
              <p className="text-lg font-bold text-gray-900">{user?.username}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Permissions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Your Permissions
          </h2>
          
          {Object.keys(permissions).length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">You don't have any permissions assigned yet.</p>
              <p className="text-sm text-gray-400 mt-1">Contact your administrator to get access.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(permissions).map(([module, actions]) => (
                <div key={module} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{module}</h3>
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <span
                        key={action}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permission Simulation */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Play className="h-5 w-5 mr-2" />
            Test Permissions
          </h2>
          
          <form onSubmit={handleSubmit(onSimulate)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <select {...register('userId', { required: true })} className="input">
                <option value="">Select a user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module
              </label>
              <select {...register('module', { required: true })} className="input">
                <option value="">Select a module</option>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select {...register('action', { required: true })} className="input">
                <option value="">Select an action</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Testing...' : 'Test Permission'}
            </button>
          </form>

          {/* Simulation Result */}
          {simulation && (
            <div className="mt-6 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Simulation Result
                </span>
                {simulation.hasPermission ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <p className={`text-sm ${
                simulation.hasPermission ? 'text-green-700' : 'text-red-700'
              }`}>
                {simulation.message}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                User ID: {simulation.userId} | Module: {simulation.module} | Action: {simulation.action}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { name: 'Users', icon: UsersIcon, path: '/users', module: 'Users' },
            { name: 'Groups', icon: Shield, path: '/groups', module: 'Groups' },
            { name: 'Roles', icon: Key, path: '/roles', module: 'Roles' },
            { name: 'Modules', icon: Settings, path: '/modules', module: 'Modules' },
            { name: 'Permissions', icon: Lock, path: '/permissions', module: 'Permissions' },
          ].map((item) => {
            const Icon = item.icon
            const hasAccess = permissions[item.module] && permissions[item.module].includes('read')
            
            return (
              <div
                key={item.name}
                className={`p-4 text-center border rounded-lg transition-colors ${
                  hasAccess 
                    ? 'border-primary-200 bg-primary-50 cursor-pointer hover:bg-primary-100' 
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                }`}
                onClick={() => hasAccess && navigate(item.path)}
              >
                <Icon className={`h-8 w-8 mx-auto mb-2 ${
                  hasAccess ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  hasAccess ? 'text-primary-900' : 'text-gray-500'
                }`}>
                  {item.name}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard 