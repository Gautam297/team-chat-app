import { useState, useEffect, useRef } from 'react';
import { Send, Hash } from 'lucide-react';

function ChatArea({ 
  channel, 
  messages, 
  onSendMessage, 
  onLoadMore,
  hasMore,
  currentUser,
  typingUsers
}) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
      setIsTyping(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping && e.target.value) {
      setIsTyping(true);
      // Emit typing event (will be handled by parent)
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500'
    ];
    const index = id?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Hash className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Select a channel to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Channel Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Hash className="w-5 h-5 mr-2 text-gray-600" />
          <h2 className="font-bold text-lg">{channel.name}</h2>
        </div>
        {channel.description && (
          <p className="text-sm text-gray-500 mt-1">{channel.description}</p>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {hasMore && (
          <div className="text-center">
            <button
              onClick={onLoadMore}
              className="text-sm text-blue-500 hover:underline"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.map((message) => {
          const isOwn = message.user_id === currentUser?.id;
          const profile = message.profiles || {};
          
          return (
            <div key={message.id} className="flex items-start">
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(message.user_id)} flex items-center justify-center text-white font-bold mr-3 flex-shrink-0`}>
                {getInitials(profile.full_name || 'User')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline">
                  <span className="font-semibold mr-2">
                    {isOwn ? 'You' : profile.full_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p className="text-gray-800 mt-1 break-words">{message.content}</p>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-500 italic">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={`Message #${channel.name}`}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="ml-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatArea;