import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { 
  Lock, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  X,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { permissionsAPI, modulesAPI } from '../services/api'

const Permissions = () => {
  const [permissions, setPermissions] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState(null)
  const [permissionDetails, setPermissionDetails] = useState(null)
  const [expandedModules, setExpandedModules] = useState({})
  const [formData, setFormData] = useState({
    action: '',
    module_id: ''
  })

  const { user, permissions: userPermissions } = useSelector((state) => state.auth)

  // Permissions are stored as an object: { "Permissions": ["create", "read", ...] }
  const permissionModulePermissions = userPermissions.Permissions || []

  const canCreate = permissionModulePermissions.includes('create')
  const canUpdate = permissionModulePermissions.includes('update')
  const canDelete = permissionModulePermissions.includes('delete')

  const actionOptions = ['create', 'read', 'update', 'delete']

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [permissionsResponse, modulesResponse] = await Promise.all([
        permissionsAPI.getAll(),
        modulesAPI.getAll()
      ])
      setPermissions(permissionsResponse.data)
      setModules(modulesResponse.data)
      
      // Auto-expand first few modules
      const initialExpanded = {}
      modulesResponse.data.slice(0, 3).forEach(module => {
        initialExpanded[module.name] = true
      })
      setExpandedModules(initialExpanded)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load permissions. Please check your authentication.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissionDetails = async (id) => {
    try {
      const response = await permissionsAPI.getById(id)
      setPermissionDetails(response.data)
    } catch (error) {
      console.error('Failed to fetch permission details:', error)
    }
  }

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const moduleName = permission.module_name
    if (!acc[moduleName]) {
      acc[moduleName] = {
        module_id: permission.module_id,
        module_name: moduleName,
        permissions: []
      }
    }
    acc[moduleName].permissions.push(permission)
    return acc
  }, {})

  // Filter grouped permissions based on search
  const filteredGroupedPermissions = Object.entries(groupedPermissions).reduce((acc, [moduleName, moduleData]) => {
    const moduleMatches = moduleName.toLowerCase().includes(searchTerm.toLowerCase())
    const filteredPermissions = moduleData.permissions.filter(permission =>
      moduleMatches || permission.action.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    if (filteredPermissions.length > 0) {
      acc[moduleName] = {
        ...moduleData,
        permissions: filteredPermissions
      }
    }
    return acc
  }, {})

  const toggleModule = (moduleName) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }))
  }

  const handleAddPermission = () => {
    setFormData({ action: '', module_id: '' })
    setShowAddModal(true)
  }

  const handleEditPermission = async (permission) => {
    setSelectedPermission(permission)
    setFormData({
      action: permission.action,
      module_id: permission.module_id
    })
    await fetchPermissionDetails(permission.id)
    setShowEditModal(true)
  }

  const handleDeletePermission = (permission) => {
    setSelectedPermission(permission)
    setShowDeleteModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.action || !formData.module_id) {
      toast.error('All fields are required')
      return
    }

    try {
      if (showAddModal) {
        await permissionsAPI.create(formData)
        toast.success('Permission created successfully')
        setShowAddModal(false)
      } else if (showEditModal) {
        await permissionsAPI.update(selectedPermission.id, { action: formData.action })
        toast.success('Permission updated successfully')
        setShowEditModal(false)
      }
      
      setFormData({ action: '', module_id: '' })
      setSelectedPermission(null)
      setPermissionDetails(null)
      fetchData()
    } catch (error) {
      console.error('Error saving permission:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await permissionsAPI.delete(selectedPermission.id)
      toast.success('Permission deleted successfully')
      setShowDeleteModal(false)
      setSelectedPermission(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting permission:', error)
    }
  }

  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setSelectedPermission(null)
    setPermissionDetails(null)
    setFormData({ action: '', module_id: '' })
  }

  const getActionColor = (action) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      read: 'bg-blue-100 text-blue-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800'
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">Loading permissions...</span>
      </div>
    )
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permissions</h1>
          <p className="text-gray-600">Manage fine-grained permissions for system actions</p>
        </div>
        {canCreate && (
          <button
            onClick={handleAddPermission}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Permission</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search permissions or modules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Permissions Grouped by Module */}
      <div className="bg-white rounded-lg shadow overflow-hidden">

        
        {Object.keys(filteredGroupedPermissions).length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            {searchTerm ? 'No permissions found matching your search.' : 'No permissions available.'}
          </div>
        ) : (
          Object.entries(filteredGroupedPermissions).map(([moduleName, moduleData]) => (
            <div key={moduleName} className="border-b border-gray-200 last:border-b-0">
              {/* Module Header */}
              <div 
                className="bg-gray-50 px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleModule(moduleName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {expandedModules[moduleName] ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <Shield className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{moduleName}</h3>
                      <p className="text-xs text-gray-500">
                        {moduleData.permissions.length} permission{moduleData.permissions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {moduleData.permissions.map(permission => (
                      <span
                        key={permission.id}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(permission.action)}`}
                      >
                        {permission.action}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Permissions Table */}
              {expandedModules[moduleName] && (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roles
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        {(canUpdate || canDelete) && (
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {moduleData.permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(permission.action)}`}>
                              {permission.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {permission.role_count} role{permission.role_count !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(permission.created_at).toLocaleDateString()}
                          </td>
                          {(canUpdate || canDelete) && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              {canUpdate && (
                                <button
                                  onClick={() => handleEditPermission(permission)}
                                  className="text-primary-600 hover:text-primary-900"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeletePermission(permission)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Permission Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {showAddModal ? 'Add New Permission' : 'Edit Permission'}
              </h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module *
                  </label>
                  <select
                    value={formData.module_id}
                    onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
                    className="input"
                    required
                    disabled={showEditModal} // Can't change module in edit mode
                  >
                    <option value="">Select module</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                  {showEditModal && (
                    <p className="text-xs text-gray-500 mt-1">
                      Module cannot be changed for existing permissions
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action *
                  </label>
                  <select
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select action</option>
                    {actionOptions.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </div>

                {showEditModal && permissionDetails && permissionDetails.roles && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned to Roles
                    </label>
                    <div className="bg-gray-50 rounded-md p-3">
                      {permissionDetails.roles.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Not assigned to any roles</p>
                      ) : (
                        <div className="space-y-2">
                          {permissionDetails.roles.map((role) => (
                            <div key={role.id} className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{role.name}</span>
                              <span className="text-xs text-gray-500">{role.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

                             <div className="flex justify-end space-x-3 mt-6">
                 <button
                   type="button"
                   onClick={closeModals}
                   className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                 >
                   {showAddModal ? 'Create Permission' : 'Update Permission'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPermission && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Permission</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    Are you sure you want to delete the <strong>"{selectedPermission.action}"</strong> permission 
                    for <strong>"{selectedPermission.module_name}"</strong>?
                  </p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This will remove this permission from all roles that currently have it. This action cannot be undone.
                </p>
              </div>
            </div>

                         <div className="flex justify-end space-x-3">
               <button
                 onClick={closeModals}
                 className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={handleDelete}
                 className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
               >
                 Delete Permission
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Permissions 