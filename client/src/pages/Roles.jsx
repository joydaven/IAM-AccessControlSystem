import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  X, 
  Lock,
  Shield 
} from 'lucide-react'
import { selectPermissions } from '../store/slices/authSlice'
import { rolesAPI, permissionsAPI } from '../services/api'
import toast from 'react-hot-toast'

// Validation schema
const roleSchema = yup.object({
  name: yup.string().min(3, 'Role name must be at least 3 characters').required('Role name is required'),
  description: yup.string().max(500, 'Description cannot exceed 500 characters')
})

// Permission Assignment Modal Component
const PermissionModal = ({ role, permissions, onClose, onSuccess }) => {
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [currentPermissions, setCurrentPermissions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCurrentPermissions()
  }, [role.id])

  const fetchCurrentPermissions = async () => {
    try {
      setLoading(true)
      const response = await rolesAPI.getById(role.id)
      setCurrentPermissions(response.data.permissions || [])
    } catch (error) {
      console.error('Failed to fetch current permissions:', error)
      setCurrentPermissions([])
    } finally {
      setLoading(false)
    }
  }

  const isAssigned = (permissionId) => {
    return currentPermissions.some(perm => perm.id === permissionId)
  }

  const handleToggle = (permissionId) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleAssign = async () => {
    if (selectedPermissions.length === 0) {
      toast.error('Please select permissions to assign')
      return
    }

    try {
      setLoading(true)
      await rolesAPI.assignPermissions(role.id, selectedPermissions)
      toast.success(`${selectedPermissions.length} permission(s) assigned successfully`)
      onSuccess()
    } catch (error) {
      const message = error.response?.data?.error || 'Assignment failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (permissionId) => {
    try {
      setLoading(true)
      await rolesAPI.removePermissions(role.id, [permissionId])
      toast.success('Permission removed successfully')
      fetchCurrentPermissions()
    } catch (error) {
      const message = error.response?.data?.error || 'Removal failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const unassignedPermissions = permissions.filter(perm => !isAssigned(perm.id))

  // Group permissions by module
  const groupedCurrent = {}
  const groupedAvailable = {}

  currentPermissions.forEach(perm => {
    if (!groupedCurrent[perm.module_name]) {
      groupedCurrent[perm.module_name] = []
    }
    groupedCurrent[perm.module_name].push(perm)
  })

  unassignedPermissions.forEach(perm => {
    if (!groupedAvailable[perm.module_name]) {
      groupedAvailable[perm.module_name] = []
    }
    groupedAvailable[perm.module_name].push(perm)
  })

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Manage Permissions for "{role.name}"
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Permissions */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Current Permissions ({currentPermissions.length})
            </h4>
            
            <div className="border rounded-md max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : currentPermissions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No permissions assigned
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {Object.entries(groupedCurrent).map(([module, perms]) => (
                    <div key={module} className="border-b border-gray-200 pb-3">
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Shield className="h-4 w-4 mr-1" />
                        {module}
                      </h5>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-700 capitalize">{perm.action}</span>
                            <button
                              onClick={() => handleRemove(perm.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Permissions */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">
              Available Permissions ({unassignedPermissions.length})
            </h4>
            
            <div className="border rounded-md max-h-96 overflow-y-auto">
              {unassignedPermissions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  All permissions are already assigned
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {Object.entries(groupedAvailable).map(([module, perms]) => (
                    <div key={module} className="border-b border-gray-200 pb-3">
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Shield className="h-4 w-4 mr-1" />
                        {module}
                      </h5>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex items-center">
                            <label className="flex items-center space-x-3 cursor-pointer w-full">
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(perm.id)}
                                onChange={() => handleToggle(perm.id)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700 capitalize">{perm.action}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedPermissions.length > 0 && (
              <button
                onClick={handleAssign}
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Assigning...' : `Assign ${selectedPermissions.length} Permission(s)`}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const Roles = () => {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [managingRole, setManagingRole] = useState(null)
  const userPermissions = useSelector(selectPermissions)

  const isEdit = !!editingRole
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(roleSchema)
  })

  const hasPermission = (action) => {
    return userPermissions.Roles && userPermissions.Roles.includes(action)
  }

  useEffect(() => {
    if (hasPermission('read')) {
      fetchRoles()
      fetchPermissions()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchRoles = async () => {
    try {
      const response = await rolesAPI.getAll()
      setRoles(response.data)
    } catch (error) {
      toast.error('Failed to fetch roles')
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await permissionsAPI.getAll()
      setPermissions(response.data)
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }

  const openAddModal = () => {
    setEditingRole(null)
    reset({
      name: '',
      description: ''
    })
    setShowModal(true)
  }

  const openEditModal = (role) => {
    setEditingRole(role)
    reset({
      name: role.name,
      description: role.description || ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingRole(null)
    reset()
  }

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await rolesAPI.update(editingRole.id, data)
        toast.success('Role updated successfully')
      } else {
        await rolesAPI.create(data)
        toast.success('Role created successfully')
      }
      
      fetchRoles()
      closeModal()
    } catch (error) {
      const message = error.response?.data?.error || 'Operation failed'
      toast.error(message)
    }
  }

  const openDeleteModal = (role) => {
    setRoleToDelete(role)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setRoleToDelete(null)
  }

  const handleDelete = async () => {
    if (!roleToDelete) return

    try {
      await rolesAPI.delete(roleToDelete.id)
      toast.success('Role deleted successfully')
      fetchRoles()
      closeDeleteModal()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete role'
      toast.error(message)
    }
  }

  const openPermissionModal = (role) => {
    setManagingRole(role)
    setShowPermissionModal(true)
  }

  const closePermissionModal = () => {
    setShowPermissionModal(false)
    setManagingRole(null)
  }

  if (!hasPermission('read')) {
    return (
      <div className="text-center py-12">
        <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500">You don't have permission to view roles.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600">Manage roles and permission assignments</p>
        </div>
        {hasPermission('create') && (
          <button 
            onClick={openAddModal} 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center py-8">Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className="text-center py-12">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Roles Found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first role.</p>
            {hasPermission('create') && (
              <button 
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  {(hasPermission('update') || hasPermission('delete')) && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Key className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">{role.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {role.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{role.permission_count || 0}</span>
                        {hasPermission('update') && (
                          <button
                            onClick={() => openPermissionModal(role)}
                            className="ml-2 text-xs text-primary-600 hover:text-primary-800"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(role.created_at).toLocaleDateString()}
                    </td>
                    {(hasPermission('update') || hasPermission('delete')) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {hasPermission('update') && (
                            <button 
                              onClick={() => openEditModal(role)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit role"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('delete') && (
                            <button 
                              onClick={() => openDeleteModal(role)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete role"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isEdit ? 'Edit Role' : 'Add New Role'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className={`input ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Enter role name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className={`input ${errors.description ? 'border-red-500' : ''}`}
                  placeholder="Enter role description (optional)"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                >
                  {isEdit ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && roleToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <Trash2 className="mx-auto h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Role</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete <strong>{roleToDelete.name}</strong>? 
                This action cannot be undone and will remove all permission assignments.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Delete Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Assignment Modal */}
      {showPermissionModal && managingRole && (
        <PermissionModal
          role={managingRole}
          permissions={permissions}
          onClose={closePermissionModal}
          onSuccess={() => {
            fetchRoles()
            closePermissionModal()
          }}
        />
      )}
    </div>
  )
}

export default Roles 