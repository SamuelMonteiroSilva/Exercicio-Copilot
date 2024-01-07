// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Use middleware
app.use(bodyParser.json());
app.use(cors());

// Store all comments
const commentsByPostId = {};
// Route handler for post request
app.post('/posts/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    // Get comments for a post
    const comments = commentsByPostId[id] || [];
    // Generate random id
    const commentId = require('crypto').randomBytes(4).toString('hex');
    // Add comment to comments array
    comments.push({ id: commentId, content, status: 'pending' });
    // Store comments
    commentsByPostId[id] = comments;
    // Emit event
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: { id: commentId, content, postId: id, status: 'pending' }
    });
    // Send response
    res.status(201).send(comments);
});

// Route handler for get request
app.get('/posts/:id/comments', (req, res) => {
    const { id } = req.params;
    // Get comments for a post
    const comments = commentsByPostId[id] || [];
    // Send response
    res.send(comments);
});

// Route handler for post request
app.post('/events', async (req, res) => {
    const { type, data } = req.body;
    // Check for comment moderation
    if (type === 'CommentModerated') {
        const { postId, id, status, content } = data;
        // Get comments for a post
        const comments = commentsByPostId[postId];
        // Find comment by id
        const comment = comments.find(comment => {
            return comment.id === id;
        });
        // Update status
        comment.status = status;
        // Emit event
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: { id, status, postId, content }
        });
    }
    // Send response
    res.send({});
});

// Listen on port 4001
app
