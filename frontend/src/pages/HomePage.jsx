import React, { useState, useEffect } from "react";
import axios from "axios";
import "./HomePage.css";

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // axios response object structure:
  //   {
  //   data: ...,        // 🔹 The actual response body from the server
  //   status: 200,      // 🔹 HTTP status code (e.g., 200, 404, 500)
  //   statusText: "OK", // 🔹 Textual representation of the status
  //   headers: {...},   // 🔹 Response headers
  //   config: {...},    // 🔹 The axios config that initiated the request
  //   request: ...      // 🔹 The underlying XMLHttpRequest or Fetch object
  // }

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/posts");
        setPosts(response.data.data.posts);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="homepage">
      <h1>Latest Posts</h1>
      <div className="posts-container">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="post-card">
              <h2>{post.title}</h2>
              <p>{post.content.substring(0, 100)}...</p>
              <p>
                <em>By {post.author.name}</em>
              </p>
            </div>
          ))
        ) : (
          <p>No posts found.</p>
        )}
      </div>
    </div>
  );
};

export default HomePage;
