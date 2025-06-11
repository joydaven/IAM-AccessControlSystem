import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  X, 
  Users as UsersIcon,
  Key as RoleIcon 
} from 'lucide-react'
import { selectPermissions } from '../store/slices/authSlice'
import { groupsAPI, usersAPI, rolesAPI } from '../services/api'
import toast from 'react-hot-toast'

// Validation schema
const groupSchema = yup.object({
  name: yup.string().min(3, 'Group name must be at least 3 characters').required('Group name is required'),
  description: yup.string().max(500, 'Description cannot exceed 500 characters')
})

// Assignment Modal Component
const AssignmentModal = ({ group, type, users, roles, onClose, onSuccess }) => {
  const [selectedItems, setSelectedItems] = useState([])
  const [currentAssignments, setCurrentAssignments] = useState([])
  const [loading, setLoading] = useState(false)

  const items = type === 'users' ? users : roles
  const isUsers = type === 'users'

  useEffect(() => {
    fetchCurrentAssignments()
  }, [group.id, type])

  const fetchCurrentAssignments = async () => {
    try {
      setLoading(true)
      if (isUsers) {
        // Get users in this group
        const response = await groupsAPI.getById(group.id)
        setCurrentAssignments(response.data.users || [])
      } else {
        // Get roles in this group
        const response = await groupsAPI.getById(group.id)
        setCurrentAssignments(response.data.roles || [])
      }
    } catch (error) {
      console.error('Failed to fetch current assignments:', error)
      setCurrentAssignments([])
    } finally {
      setLoading(false)
    }
  }

  const isAssigned = (itemId) => {
    return currentAssignments.some(item => item.id === itemId)
  }

  const handleToggle = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleAssign = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to assign')
      return
    }

    try {
      setLoading(true)
      if (isUsers) {
        await groupsAPI.assignUsers(group.id, selectedItems)
        toast.success(`${selectedItems.length} user(s) assigned successfully`)
      } else {
        await groupsAPI.assignRoles(group.id, selectedItems)
        toast.success(`${selectedItems.length} role(s) assigned successfully`)
      }
      onSuccess()
    } catch (error) {
      const message = error.response?.data?.error || 'Assignment failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (itemId) => {
    try {
      setLoading(true)
      if (isUsers) {
        await groupsAPI.removeUsers(group.id, [itemId])
        toast.success('User removed successfully')
      } else {
        await groupsAPI.removeRoles(group.id, [itemId])
        toast.success('Role removed successfully')
      }
      fetchCurrentAssignments()
    } catch (error) {
      const message = error.response?.data?.error || 'Removal failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const unassignedItems = items.filter(item => !isAssigned(item.id))

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Manage {isUsers ? 'Users' : 'Roles'} for "{group.name}"
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Assignments */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              {isUsers ? <UsersIcon className="h-4 w-4 mr-2" /> : <RoleIcon className="h-4 w-4 mr-2" />}
              Current {isUsers ? 'Members' : 'Roles'} ({currentAssignments.length})
            </h4>
            
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : currentAssignments.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No {isUsers ? 'users' : 'roles'} assigned
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {currentAssignments.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {isUsers ? item.username : item.name}
                        </div>
                        {isUsers && (
                          <div className="text-xs text-gray-500">{item.email}</div>
                        )}
                        {!isUsers && item.description && (
                          <div className="text-xs text-gray-500">{item.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available for Assignment */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">
              Available {isUsers ? 'Users' : 'Roles'} ({unassignedItems.length})
            </h4>
            
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {unassignedItems.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  All {isUsers ? 'users' : 'roles'} are already assigned
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {unassignedItems.map((item) => (
                    <div key={item.id} className="p-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleToggle(item.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {isUsers ? item.username : item.name}
                          </div>
                          {isUsers && (
                            <div className="text-xs text-gray-500">{item.email}</div>
                          )}
                          {!isUsers && item.description && (
                            <div className="text-xs text-gray-500">{item.description}</div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedItems.length > 0 && (
              <button
                onClick={handleAssign}
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Assigning...' : `Assign ${selectedItems.length} ${isUsers ? 'User(s)' : 'Role(s)'}`}
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

const Groups = () => {
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningGroup, setAssigningGroup] = useState(null)
  const [assignType, setAssignType] = useState('users') // 'users' or 'roles'
  const permissions = useSelector(selectPermissions)

  const isEdit = !!editingGroup
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(groupSchema)
  })

  const hasPermission = (action) => {
    return permissions.Groups && permissions.Groups.includes(action)
  }

  useEffect(() => {
    if (hasPermission('read')) {
      fetchGroups()
      fetchUsers()
      fetchRoles()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchGroups = async () => {
    try {
      const response = await groupsAPI.getAll()
      setGroups(response.data)
    } catch (error) {
      toast.error('Failed to fetch groups')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll()
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await rolesAPI.getAll()
      setRoles(response.data)
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
  }

  const openAddModal = () => {
    setEditingGroup(null)
    reset({
      name: '',
      description: ''
    })
    setShowModal(true)
  }

  const openEditModal = (group) => {
    setEditingGroup(group)
    reset({
      name: group.name,
      description: group.description || ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingGroup(null)
    reset()
  }

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await groupsAPI.update(editingGroup.id, data)
        toast.success('Group updated successfully')
      } else {
        await groupsAPI.create(data)
        toast.success('Group created successfully')
      }
      
      fetchGroups()
      closeModal()
    } catch (error) {
      const message = error.response?.data?.error || 'Operation failed'
      toast.error(message)
    }
  }

  const openDeleteModal = (group) => {
    setGroupToDelete(group)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setGroupToDelete(null)
  }

  const handleDelete = async () => {
    if (!groupToDelete) return

    try {
      await groupsAPI.delete(groupToDelete.id)
      toast.success('Group deleted successfully')
      fetchGroups()
      closeDeleteModal()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete group'
      toast.error(message)
    }
  }

  const openAssignModal = (group, type) => {
    setAssigningGroup(group)
    setAssignType(type)
    setShowAssignModal(true)
  }

  const closeAssignModal = () => {
    setShowAssignModal(false)
    setAssigningGroup(null)
    setAssignType('users')
  }

  if (!hasPermission('read')) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500">You don't have permission to view groups.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600">Manage user groups and role assignments</p>
        </div>
        {hasPermission('create') && (
          <button 
            onClick={openAddModal} 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center py-8">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Groups Found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first group.</p>
            {hasPermission('create') && (
              <button 
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
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
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {group.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UsersIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{group.user_count || 0}</span>
                        {hasPermission('update') && (
                          <button
                            onClick={() => openAssignModal(group, 'users')}
                            className="ml-2 text-xs text-primary-600 hover:text-primary-800"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <RoleIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{group.role_count || 0}</span>
                        {hasPermission('update') && (
                          <button
                            onClick={() => openAssignModal(group, 'roles')}
                            className="ml-2 text-xs text-primary-600 hover:text-primary-800"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(group.created_at).toLocaleDateString()}
                    </td>
                    {(hasPermission('update') || hasPermission('delete')) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {hasPermission('update') && (
                            <button 
                              onClick={() => openEditModal(group)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit group"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('delete') && (
                            <button 
                              onClick={() => openDeleteModal(group)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete group"
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

      {/* Add/Edit Group Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isEdit ? 'Edit Group' : 'Add New Group'}
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
                  Group Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className={`input ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Enter group name"
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
                  placeholder="Enter group description (optional)"
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
                  {isEdit ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <Trash2 className="mx-auto h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Group</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete <strong>{groupToDelete.name}</strong>? 
                This action cannot be undone and will remove all user assignments.
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
                  Delete Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && assigningGroup && (
        <AssignmentModal
          group={assigningGroup}
          type={assignType}
          users={users}
          roles={roles}
          onClose={closeAssignModal}
          onSuccess={() => {
            fetchGroups()
            closeAssignModal()
          }}
        />
      )}
    </div>
  )
}

export default Groups 