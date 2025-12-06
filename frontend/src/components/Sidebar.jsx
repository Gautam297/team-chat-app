import { Hash, Plus, Circle, LogOut } from 'lucide-react';

function Sidebar({ 
  channels, 
  currentChannel, 
  onChannelSelect, 
  onCreateChannel,
  onlineUsers,
  currentUser,
  onLogout 
}) {
  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">TeamChat</h2>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-gray-700 rounded"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">{currentUser?.email}</p>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-300">CHANNELS</h3>
            <button
              onClick={onCreateChannel}
              className="p-1 hover:bg-gray-700 rounded"
              title="Create Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel)}
                className={`w-full flex items-center p-2 rounded text-left ${
                  currentChannel?.id === channel.id
                    ? 'bg-blue-600'
                    : 'hover:bg-gray-700'
                }`}
              >
                <Hash className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            ONLINE ({onlineUsers.length})
          </h3>
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center text-sm">
                <Circle 
                  className={`w-2 h-2 mr-2 flex-shrink-0 ${
                    user.is_online 
                      ? 'fill-green-500 text-green-500' 
                      : 'fill-gray-500 text-gray-500'
                  }`}
                />
                <span className="truncate">{user.full_name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;