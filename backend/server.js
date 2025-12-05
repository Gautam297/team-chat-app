require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // Frontend URL
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store online users
const onlineUsers = new Map(); // userId -> socketId

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Team Chat Backend is running!' });
});

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: authData.user.id, 
          email, 
          full_name: fullName 
        }
      ]);

    if (profileError) throw profileError;

    res.json({ 
      success: true, 
      message: 'User created successfully',
      user: { id: authData.user.id, email, fullName }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({ 
      success: true,
      user: data.user,
      profile,
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Channel Routes
app.get('/api/channels', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('channels')
      .select(`
        *,
        channel_members(count)
      `);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/channels', async (req, res) => {
  try {
    const { name, description, userId } = req.body;

    const { data, error } = await supabase
      .from('channels')
      .insert([{ name, description, created_by: userId }])
      .select()
      .single();

    if (error) throw error;

    // Auto-join creator to channel
    await supabase
      .from('channel_members')
      .insert([{ channel_id: data.id, user_id: userId }]);

    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/channels/:channelId/join', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;

    const { data, error } = await supabase
      .from('channel_members')
      .insert([{ channel_id: channelId, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/channels/:channelId/leave', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;

    const { error } = await supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Message Routes
app.get('/api/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles(id, email, full_name)
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json(data.reverse()); // Return in chronological order
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get online users
app.get('/api/users/online', async (req, res) => {
  try {
    const userIds = Array.from(onlineUsers.keys());
    
    if (userIds.length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_online')
      .in('id', userIds);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User comes online
  socket.on('user-online', async (userId) => {
    onlineUsers.set(userId, socket.id);
    
    // Update database
    await supabase
      .from('profiles')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', userId);

    // Broadcast to all clients
    io.emit('user-status-changed', { userId, isOnline: true });
  });

  // Join a channel room
  socket.on('join-channel', (channelId) => {
    socket.join(channelId);
    console.log(`Socket ${socket.id} joined channel ${channelId}`);
  });

  // Leave a channel room
  socket.on('leave-channel', (channelId) => {
    socket.leave(channelId);
    console.log(`Socket ${socket.id} left channel ${channelId}`);
  });

  // Send message
  socket.on('send-message', async (messageData) => {
    try {
      const { channelId, userId, content } = messageData;

      // Save to database
      const { data, error } = await supabase
        .from('messages')
        .insert([{ channel_id: channelId, user_id: userId, content }])
        .select(`
          *,
          profiles(id, email, full_name)
        `)
        .single();

      if (error) throw error;

      // Broadcast to all users in the channel
      io.to(channelId).emit('new-message', data);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(data.channelId).emit('user-typing', {
      userId: data.userId,
      userName: data.userName,
      channelId: data.channelId
    });
  });

  socket.on('stop-typing', (data) => {
    socket.to(data.channelId).emit('user-stop-typing', {
      userId: data.userId,
      channelId: data.channelId
    });
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove user
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        
        // Update database
        await supabase
          .from('profiles')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', userId);

        // Broadcast to all clients
        io.emit('user-status-changed', { userId, isOnline: false });
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});