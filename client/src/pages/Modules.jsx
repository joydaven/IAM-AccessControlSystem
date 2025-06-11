import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  X,
  AlertTriangle,
  Package
} from 'lucide-react'
import toast from 'react-hot-toast'
import { modulesAPI } from '../services/api'

const Modules = () => {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedModule, setSelectedModule] = useState(null)
  const [moduleDetails, setModuleDetails] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const { user, permissions } = useSelector((state) => state.auth)

  // Permissions are stored as an object: { "Modules": ["create", "read", ...] }
  const modulePermissions = permissions.Modules || []

  const canCreate = modulePermissions.includes('create')
  const canUpdate = modulePermissions.includes('update')
  const canDelete = modulePermissions.includes('delete')

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      setLoading(true)
      const response = await modulesAPI.getAll()
      setModules(response.data)
    } catch (error) {
      console.error('Failed to fetch modules:', error)
      toast.error('Failed to load modules. Please check your permissions.')
    } finally {
      setLoading(false)
    }
  }

  const fetchModuleDetails = async (id) => {
    try {
      const response = await modulesAPI.getById(id)
      setModuleDetails(response.data)
    } catch (error) {
      console.error('Failed to fetch module details:', error)
    }
  }

  const filteredModules = modules.filter(module =>
    module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (module.description && module.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleAddModule = () => {
    setFormData({ name: '', description: '' })
    setShowAddModal(true)
  }

  const handleEditModule = async (module) => {
    setSelectedModule(module)
    setFormData({
      name: module.name,
      description: module.description || ''
    })
    await fetchModuleDetails(module.id)
    setShowEditModal(true)
  }

  const handleDeleteModule = (module) => {
    setSelectedModule(module)
    setShowDeleteModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Module name is required')
      return
    }

    try {
      if (showAddModal) {
        await modulesAPI.create(formData)
        toast.success('Module created successfully')
        setShowAddModal(false)
      } else if (showEditModal) {
        await modulesAPI.update(selectedModule.id, formData)
        toast.success('Module updated successfully')
        setShowEditModal(false)
      }
      
      setFormData({ name: '', description: '' })
      setSelectedModule(null)
      setModuleDetails(null)
      fetchModules()
    } catch (error) {
      console.error('Error saving module:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await modulesAPI.delete(selectedModule.id)
      toast.success('Module deleted successfully')
      setShowDeleteModal(false)
      setSelectedModule(null)
      fetchModules()
    } catch (error) {
      console.error('Error deleting module:', error)
    }
  }

  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setSelectedModule(null)
    setModuleDetails(null)
    setFormData({ name: '', description: '' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">Loading modules...</span>
      </div>
    )
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          <p className="text-gray-600">Manage system modules and business areas</p>
        </div>
        {canCreate && (
          <button
            onClick={handleAddModule}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Module</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search modules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Modules Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">

        
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Module
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
              {(canUpdate || canDelete) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredModules.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'No modules found matching your search.' : 'No modules available.'}
                </td>
              </tr>
            ) : (
              filteredModules.map((module) => (
                <tr key={module.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <Package className="h-4 w-4 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {module.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {module.description || <span className="text-gray-400 italic">No description</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {module.permission_count} permissions
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(module.created_at).toLocaleDateString()}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {canUpdate && (
                        <button
                          onClick={() => handleEditModule(module)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteModule(module)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Module Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {showAddModal ? 'Add New Module' : 'Edit Module'}
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
                    Module Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Enter module name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows="3"
                    placeholder="Enter module description"
                  />
                </div>

                {showEditModal && moduleDetails && moduleDetails.permissions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Permissions
                    </label>
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {moduleDetails.permissions.map((permission) => (
                          <span
                            key={permission.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                          >
                            {permission.action}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {showAddModal && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-700">
                      Default permissions (create, read, update, delete) will be automatically created for this module.
                    </p>
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
                  {showAddModal ? 'Create Module' : 'Update Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedModule && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Module</h3>
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
                    Are you sure you want to delete the module <strong>"{selectedModule.name}"</strong>?
                  </p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This will also delete all associated permissions and remove them from any roles. This action cannot be undone.
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
                Delete Module
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Modules 