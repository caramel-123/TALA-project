import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Users, Shield, Clock, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { settingsAuditLog as auditLog, settingsRoles as roles, settingsUsers as users } from '../../features/shared/dev-seed/non-dashboard';

export function Settings() {
  const handleInviteUser = () => {
    toast.info('Opening user invitation dialog...');
  };

  const handleUserClick = (userName: string) => {
    toast.info(`Opening profile for: ${userName}`);
  };

  const handleNavClick = (section: string) => {
    toast.info(`Navigating to ${section}`);
  };

  return (
    <div className="flex-1">
      <Toaster />
      <div className="max-w-7xl mx-auto p-6">
        <Breadcrumbs />
        
        {/* Page Header */}
        <div className="mb-6">
          <h1 
            className="mb-2" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            Settings and Administration
          </h1>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
            Control access, governance, and system behavior
          </p>
        </div>

        {/* Settings Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users, label: 'User Management', color: '#2E6DA4' },
            { icon: Shield, label: 'Data Governance', color: '#E8C94F' },
            { icon: Clock, label: 'Audit Log', color: '#A8C8E8' },
            { icon: Key, label: 'Access Control', color: '#1B3A5C' },
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => handleNavClick(item.label)}
              className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all text-left cursor-pointer"
            >
              <item.icon className="w-8 h-8 mb-3" style={{ color: item.color }} />
              <div 
                style={{ 
                  fontFamily: 'Arial, sans-serif', 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  color: '#1B3A5C' 
                }}
              >
                {item.label}
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Management */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 
                style={{ 
                  fontFamily: 'Arial, sans-serif', 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#1B3A5C' 
                }}
              >
                User Management
              </h2>
              <button 
                onClick={handleInviteUser}
                className="px-4 py-2 rounded bg-[#2E6DA4] text-white hover:bg-[#1B3A5C] transition-colors cursor-pointer"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold' }}
              >
                Invite User
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#D5E8F7' }}>
                    <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Name</th>
                    <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Email</th>
                    <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Role</th>
                    <th className="text-left p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Last Login</th>
                    <th className="text-center p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: 'bold', color: '#1B3A5C' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr 
                      key={index}
                      onClick={() => handleUserClick(user.name)}
                      className="border-b hover:bg-[#EBF4FB] cursor-pointer transition-colors"
                      style={{ borderColor: '#D8D8D8' }}
                    >
                      <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                        {user.name}
                      </td>
                      <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                        {user.email}
                      </td>
                      <td className="p-3">
                        <span 
                          className="px-2 py-1 rounded text-xs"
                          style={{ 
                            fontFamily: 'Arial, sans-serif', 
                            fontWeight: 'bold',
                            backgroundColor: '#D5E8F7',
                            color: '#1B3A5C'
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                        {user.lastLogin}
                      </td>
                      <td className="text-center p-3">
                        <span 
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: '#2E6DA4' }}
                        ></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Definitions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 
              className="mb-4" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              Role Definitions
            </h2>
            <div className="space-y-4">
              {roles.map((role, index) => (
                <div 
                  key={index}
                  className="p-3 rounded border cursor-pointer hover:border-[#2E6DA4] transition-colors"
                  style={{ borderColor: '#D8D8D8' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 
                      style={{ 
                        fontFamily: 'Arial, sans-serif', 
                        fontSize: '11px', 
                        fontWeight: 'bold',
                        color: '#1B3A5C' 
                      }}
                    >
                      {role.name}
                    </h3>
                    <span 
                      className="px-2 py-1 rounded"
                      style={{ 
                        fontFamily: 'Arial, sans-serif', 
                        fontSize: '9px',
                        backgroundColor: '#EBF4FB',
                        color: '#1A1A1A'
                      }}
                    >
                      {role.users} users
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {role.permissions.map((permission, pIndex) => (
                      <li 
                        key={pIndex}
                        className="flex items-start gap-2"
                        style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}
                      >
                        <span style={{ color: '#2E6DA4' }}>•</span>
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 
            className="mb-4" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            Recent Activity (Audit Log)
          </h2>
          <div className="space-y-3">
            {auditLog.map((entry, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-3 rounded hover:bg-[#EBF4FB] transition-colors"
              >
                <div className="flex-shrink-0">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#D5E8F7', color: '#1B3A5C' }}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                    <strong>{entry.user}</strong> {entry.action}
                  </div>
                  <div className="flex items-center gap-2 mt-1" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                    <span>{entry.module}</span>
                    <span>•</span>
                    <span>{entry.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Governance Settings */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 
            className="mb-4" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            Data Governance Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded" style={{ backgroundColor: '#EBF4FB' }}>
              <div>
                <div 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: '#1B3A5C' 
                  }}
                >
                  Data Retention Policy
                </div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                  Automatically archive data older than 3 years
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-[#D8D8D8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E6DA4]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded" style={{ backgroundColor: '#EBF4FB' }}>
              <div>
                <div 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: '#1B3A5C' 
                  }}
                >
                  Teacher Name Anonymization
                </div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                  Show anonymized teacher identifiers instead of names
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-[#D8D8D8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E6DA4]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded" style={{ backgroundColor: '#EBF4FB' }}>
              <div>
                <div 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: '#1B3A5C' 
                  }}
                >
                  Privacy Audit Logging
                </div>
                <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                  Track all data access and exports
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-[#D8D8D8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E6DA4]"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}