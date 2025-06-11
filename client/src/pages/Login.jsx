import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { Lock, User, Eye, EyeOff } from 'lucide-react'
import { 
  loginStart, 
  loginSuccess, 
  loginFailure,
  setPermissions,
  selectAuthLoading,
  selectIsAuthenticated 
} from '../store/slices/authSlice'
import { authAPI } from '../services/api'

const loginSchema = yup.object({
  username: yup.string().required('Username is required'),
  password: yup.string().required('Password is required'),
})

const registerSchema = yup.object({
  username: yup.string().min(3, 'Username must be at least 3 characters').required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
})

const Login = () => {
  const [isRegister, setIsRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const dispatch = useDispatch()
  const loading = useSelector(selectAuthLoading)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  const schema = isRegister ? registerSchema : loginSchema
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(schema)
  })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data) => {
    dispatch(loginStart())
    
    try {
      if (isRegister) {
        // Register user
        const registerResponse = await authAPI.register(data)
        toast.success('Registration successful! You are now logged in.')
        
        // Auto-login after registration
        const { user, token } = registerResponse.data
        dispatch(loginSuccess({ user, token }))
        
        // Get permissions
        const permissionsResponse = await authAPI.getPermissions()
        dispatch(setPermissions(permissionsResponse.data.permissions))
      } else {
        // Login user
        const loginResponse = await authAPI.login(data)
        const { user, token } = loginResponse.data
        
        dispatch(loginSuccess({ user, token }))
        
        // Get permissions
        const permissionsResponse = await authAPI.getPermissions()
        dispatch(setPermissions(permissionsResponse.data.permissions))
        
        toast.success('Login successful!')
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Authentication failed'
      dispatch(loginFailure(message))
    }
  }

  const toggleMode = () => {
    setIsRegister(!isRegister)
    reset()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-600">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegister ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            IAM Access Control System
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('username')}
                  type="text"
                  className={`input pl-10 ${errors.username ? 'border-red-500' : ''}`}
                  placeholder="Enter your username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            {isRegister && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className={`input ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              {isRegister 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </form>

        {/* Demo credentials info */}
        {!isRegister && (
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800">Demo Access</h3>
            <p className="text-xs text-blue-600 mt-1">
              Register as a regular user to test the permission system.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center border-t border-gray-200 pt-6">
          <p className="text-xs text-gray-500">
            by: <span className="font-medium text-gray-700">Joy Dave Negrido</span>
          </p>
          <p className="text-xs text-gray-500">
            <a href="mailto:joydaven@gmail.com" className="text-primary-600 hover:text-primary-500">
              joydaven@gmail.com
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ©2025
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login 