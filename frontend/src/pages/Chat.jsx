import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import { api } from '../utils/api';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function Chat() {
  const [socket, setSocket] = useState(null);
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  // Initialize user and socket
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const profileStr = localStorage.getItem('profile');
    
    if (!userStr || !profileStr) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    const userProfile = JSON.parse(profileStr);
    setCurrentUser(user);
    setProfile(userProfile);

    // Initialize socket connection
    // Initialize socket connection
const newSocket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});
setSocket(newSocket);

newSocket.on('connect', () => {
  console.log('Connected to WebSocket');
  newSocket.emit('user-online', user.id);
});

newSocket.on('disconnect', () => {
  console.log('Disconnected from WebSocket');
});

newSocket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  // Load channels
  useEffect(() => {
    loadChannels();
    loadOnlineUsers();
  }, []);

  // Socket event listeners
useEffect(() => {
  if (!socket) return;

  socket.on('new-message', (message) => {
    console.log('Received new message:', message);
    console.log('Current channel:', currentChannel?.id);
    console.log('Message channel:', message.channel_id);
    
    if (message.channel_id === currentChannel?.id) {
      console.log('Adding message to state');
      setMessages((prev) => [...prev, message]);
    } else {
      console.log('Message for different channel, ignoring');
    }
  });

  socket.on('user-status-changed', () => {
    console.log('User status changed');
    loadOnlineUsers();
  });

  socket.on('user-typing', (data) => {
    console.log('User typing:', data);
    if (data.channelId === currentChannel?.id && data.userId !== currentUser?.id) {
      setTypingUsers((prev) => [...new Set([...prev, data.userName])]);
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
      }, 3000);
    }
  });

  return () => {
    socket.off('new-message');
    socket.off('user-status-changed');
    socket.off('user-typing');
  };
}, [socket, currentChannel, currentUser]);

  const loadChannels = async () => {
    try {
      const data = await api.getChannels();
      setChannels(data);
      if (data.length > 0 && !currentChannel) {
        selectChannel(data[0]);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const users = await api.getOnlineUsers();
      setOnlineUsers(users);
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const selectChannel = async (channel) => {
    setCurrentChannel(channel);
    setMessages([]);
    setHasMore(true);
    
    // Leave previous channel
    if (currentChannel) {
      socket?.emit('leave-channel', currentChannel.id);
    }
    
    // Join new channel
    socket?.emit('join-channel', channel.id);
    
    // Load messages
    try {
      const msgs = await api.getMessages(channel.id, 10, 0);
      setMessages(msgs);
      setHasMore(msgs.length >= 10);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = (content) => {
  if (!socket || !currentChannel || !currentUser) {
    console.error('Cannot send message - missing requirements', {
      hasSocket: !!socket,
      hasChannel: !!currentChannel,
      hasUser: !!currentUser
    });
    return;
  }

  if (!socket.connected) {
    console.error('Socket not connected, reconnecting...');
    socket.connect();
    setTimeout(() => {
      if (socket.connected) {
        socket.emit('send-message', {
          channelId: currentChannel.id,
          userId: currentUser.id,
          content
        });
      }
    }, 1000);
    return;
  }

  console.log('Sending message:', content);
  socket.emit('send-message', {
    channelId: currentChannel.id,
    userId: currentUser.id,
    content
  });
};

  const handleCreateChannel = async () => {
    const name = prompt('Enter channel name:');
    if (!name) return;

    const description = prompt('Enter channel description (optional):');

    try {
      await api.createChannel(name, description, currentUser.id);
      await loadChannels();
    } catch (error) {
      alert('Failed to create channel: ' + error.message);
    }
  };

  const handleLoadMore = async () => {
    if (!currentChannel) return;

    try {
      const offset = messages.length;
    const olderMessages = await api.getMessages(currentChannel.id, 10, offset);
      
      if (olderMessages.length < 10) {
        setHasMore(false);
      }
      
      setMessages((prev) => [...olderMessages, ...prev]);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    }
  };

  const handleLogout = () => {
    socket?.disconnect();
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    localStorage.removeItem('session');
    navigate('/login');
  };

  return (
    <div className="h-screen flex">
      <Sidebar
        channels={channels}
        currentChannel={currentChannel}
        onChannelSelect={selectChannel}
        onCreateChannel={handleCreateChannel}
        onlineUsers={onlineUsers}
        currentUser={profile}
        onLogout={handleLogout}
      />
      <ChatArea
        channel={currentChannel}
        messages={messages}
        onSendMessage={handleSendMessage}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        currentUser={currentUser}
        typingUsers={typingUsers}
      />
    </div>
  );
}

export default Chat;