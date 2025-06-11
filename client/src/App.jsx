import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { 
  selectIsAuthenticated, 
  selectToken, 
  loginSuccess, 
  logout,
  setPermissions 
} from './store/slices/authSlice'
import { authAPI } from './services/api'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Groups from './pages/Groups'
import Roles from './pages/Roles'
import Modules from './pages/Modules'
import Permissions from './pages/Permissions'

function App() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const token = useSelector(selectToken)

  useEffect(() => {
    const initializeAuth = async () => {
      if (token && !isAuthenticated) {
        try {
          const response = await authAPI.getPermissions()
          const { user, permissions } = response.data
          
          dispatch(loginSuccess({ user, token }))
          dispatch(setPermissions(permissions))
        } catch (error) {
          dispatch(logout())
        }
      }
    }

    initializeAuth()
  }, [token, isAuthenticated, dispatch])

  return (
    <div className="App">
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          } 
        />
        
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/roles" element={<Roles />} />
                  <Route path="/modules" element={<Modules />} />
                  <Route path="/permissions" element={<Permissions />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </div>
  )
}

export default App 